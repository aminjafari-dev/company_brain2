import type {
  ChatAgentState,
  DraftTask,
  FeatureRequest,
  JiraIssue,
  OverviewMetrics,
  RequestStatus,
} from '../types';
import { analyzeRequirement, chatWithAI } from './aiService';
import { getRepository } from './dataProvider';
import { WORKSPACE_ID } from '../data/seed';
import { config } from '../lib/config';

export const RequestService = {
  list: () => getRepository().listRequests(),
  get: (id: string) => getRepository().getRequest(id),
  metrics: (): Promise<OverviewMetrics> => getRepository().getMetrics(),
  async save(request: FeatureRequest) {
    const saved = await getRepository().upsertRequest({
      ...request,
      updatedAt: new Date().toISOString(),
    });
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: 'System',
      action: 'updated request',
      target: saved.id,
      detail: saved.status,
    });
    return saved;
  },
  async analyzeFromPrompt(prompt: string, actorName: string) {
    const request = await analyzeRequirement(prompt);
    await getRepository().upsertRequest(request);
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: 'created request',
      target: request.id,
      detail: request.title,
    });
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: 'AI Requirements Agent',
      action: 'analyzed request',
      target: request.id,
      detail: `Confidence ${request.confidence ?? 0}%`,
    });
    return request;
  },
  async setStatus(id: string, status: RequestStatus, actorName: string) {
    const existing = await getRepository().getRequest(id);
    if (!existing) throw new Error('Request not found');
    const updated = await getRepository().upsertRequest({ ...existing, status });
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: 'changed status',
      target: id,
      detail: status,
    });
    return updated;
  },
  async pmDecision(
    id: string,
    decision: 'Approved' | 'Requested Info' | 'Rejected',
    actorName: string
  ) {
    const existing = await getRepository().getRequest(id);
    if (!existing) throw new Error('Request not found');
    const status: RequestStatus =
      decision === 'Approved'
        ? 'Approved'
        : decision === 'Rejected'
          ? 'Rejected'
          : 'AI Gathering Information';
    const updated = await getRepository().upsertRequest({
      ...existing,
      pmDecision: decision,
      status,
    });
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: decision === 'Approved' ? 'approved request' : decision.toLowerCase(),
      target: id,
      detail: existing.title,
    });
    return updated;
  },
  async createJiraTasks(id: string, actorName: string) {
    const existing = await getRepository().getRequest(id);
    if (!existing) throw new Error('Request not found');
    const nextKey = 285 + Math.floor(Math.random() * 20);
    const issues: JiraIssue[] = (existing.devPlan ?? []).map((task, index) => ({
      id: `ji-gen-${Date.now()}-${index}`,
      workspaceId: WORKSPACE_ID,
      key: `JIRA-${nextKey + index}`,
      summary: task.task,
      status: 'To Do',
      assignee: 'Unassigned',
      type: 'Sub-task',
      linkedReq: id,
    }));
    await getRepository().upsertJiraIssues(issues);
    const updated = await getRepository().upsertRequest({
      ...existing,
      jiraKey: issues[0]?.key,
      status: 'Development Planning',
      devPlan: existing.devPlan?.map((t) => ({ ...t, jiraCreated: true })),
    });
    await getRepository().appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: 'created Jira issues',
      target: id,
      detail: issues.map((i) => i.key).join(', '),
    });
    return { request: updated, issues };
  },
};

export const AIChatService = {
  async send(userId: string, text: string, actorName: string) {
    const repo = getRepository();
    const conversation = await repo.getOrCreateConversation(userId);
    const historyMsgs = await repo.listMessages(conversation.id);
    const history = historyMsgs.slice(-8).map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text,
      state: m.state,
    }));

    const userMsg = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      sender: 'user' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    await repo.appendMessages([userMsg]);

    const ai = await chatWithAI({
      prompt: text,
      conversationId: conversation.id,
      history,
    });

    const aiMsg = {
      id: `msg-${Date.now() + 1}`,
      conversationId: conversation.id,
      sender: 'ai' as const,
      text: ai.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      analysisCard: ai.analysisCard,
      state: ai.state as ChatAgentState,
      draftTask: ai.draftTask,
    };
    await repo.appendMessages([aiMsg]);
    await repo.appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: 'messaged AI',
      target: conversation.id,
      detail: text.slice(0, 80),
    });
    return { userMsg, aiMsg, state: ai.state };
  },

  async finalizeToJira(userId: string, actorName: string, draftTask: DraftTask) {
    const repo = getRepository();
    const conversation = await repo.getOrCreateConversation(userId);
    const now = new Date().toISOString();
    const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create in real Atlassian Jira first — do not fall back to a fake key.
    // Prefer same-origin /api (Vite middleware) so this works with only npm run dev.
    const jiraEndpoint = `${config.aiProxyUrl}/api/jira/issues`;
    let jiraRes: Response;
    try {
      jiraRes = await fetch(jiraEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTask.title,
          summary: draftTask.summary,
          acceptanceCriteria: draftTask.acceptanceCriteria,
          effort: draftTask.effort,
          issueType: 'Task',
        }),
      });
    } catch {
      throw new Error(
        'Could not reach the Jira API. Restart npm run dev after setting JIRA_* in .env.local (Create on Jira no longer needs a separate ai-server).'
      );
    }
    const jiraBody = (await jiraRes.json().catch(() => ({}))) as {
      id?: string;
      key?: string;
      browseUrl?: string;
      error?: string;
    };
    if (!jiraRes.ok || !jiraBody.key) {
      throw new Error(
        jiraBody.error ||
          `Failed to create real Jira issue (${jiraRes.status}). Check JIRA_* env vars and restart npm run dev.`
      );
    }

    const jiraKey = jiraBody.key;
    if (!jiraBody.browseUrl) {
      throw new Error('Jira API did not return a browse URL');
    }
    const jiraUrl = jiraBody.browseUrl;

    const request: FeatureRequest = {
      id: reqId,
      workspaceId: WORKSPACE_ID,
      projectId: 'prj-1',
      title: draftTask.title,
      subtitle: draftTask.summary,
      status: 'Development Planning',
      confidence: 90,
      objective: draftTask.summary,
      businessGoal: draftTask.summary,
      businessRequirements: draftTask.summary,
      acceptanceCriteria: draftTask.acceptanceCriteria.map((text, index) => ({
        id: String(index + 1),
        text,
        completed: false,
      })),
      technicalImpactSummary: draftTask.summary,
      aiRecommendation: {
        title: 'Created from client AI intake',
        description: 'Client confirmed the draft; task written to real Jira.',
      },
      devPlan: [
        {
          seq: '01',
          component: 'Delivery',
          task: draftTask.title,
          effort: draftTask.effort,
          jiraCreated: true,
        },
      ],
      pmDecision: 'Approved',
      jiraKey,
      completeness: {
        businessRequirement: true,
        userActor: true,
        goal: true,
        expectedBehavior: true,
        platform: true,
        acceptanceCriteria: draftTask.acceptanceCriteria.length > 0,
        edgeCases: false,
        score: 85,
      },
      createdAt: now,
      updatedAt: now,
    };

    await repo.upsertRequest(request);

    const issue: JiraIssue = {
      id: jiraBody.id || `ji-chat-${Date.now()}`,
      workspaceId: WORKSPACE_ID,
      key: jiraKey,
      summary: draftTask.title,
      status: 'To Do',
      assignee: 'Unassigned',
      type: 'Task',
      linkedReq: reqId,
    };
    await repo.upsertJiraIssues([issue]);

    const confirmMsg = {
      id: `msg-${Date.now() + 2}`,
      conversationId: conversation.id,
      sender: 'ai' as const,
      text: `Done. I created ${jiraKey} in your real Jira project for "${draftTask.title}" (linked to ${reqId}).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      state: 'finalized' as const,
      jiraKey,
      jiraUrl,
      analysisCard: {
        title: draftTask.title,
        status: 'Created',
        summary: draftTask.summary,
        affectedSystems: [],
        relatedJira: jiraKey,
        estComplexity: draftTask.effort,
      },
    };
    await repo.appendMessages([confirmMsg]);
    await repo.appendActivity({
      workspaceId: WORKSPACE_ID,
      actor: actorName,
      action: 'created real Jira issue from AI chat',
      target: jiraKey,
      detail: `${reqId}: ${draftTask.title}`,
    });

    return { request, issue, confirmMsg, jiraUrl };
  },

  listMessages: async (userId: string) => {
    const conv = await getRepository().getOrCreateConversation(userId);
    return getRepository().listMessages(conv.id);
  },
};

export const ProjectService = {
  list: () => getRepository().listProjects(),
};

export const JiraService = {
  list: () => getRepository().listJiraIssues(),
  createIssue: async (issue: JiraIssue) => {
    await getRepository().upsertJiraIssues([issue]);
    return issue;
  },
};

export const CodebaseService = {
  list: () => getRepository().listCodeFiles(),
};

export const KnowledgeService = {
  categories: () => getRepository().listKnowledge(),
  sources: () => getRepository().listSources(),
  documents: (categoryId?: string) => getRepository().listKnowledgeDocuments(categoryId),
  addDocument: (
    doc: Parameters<ReturnType<typeof getRepository>['addKnowledgeDocument']>[0]
  ) => getRepository().addKnowledgeDocument(doc),
  deleteDocument: (id: string) => getRepository().deleteKnowledgeDocument(id),
};

export const DevelopmentService = {
  list: () => getRepository().listDevelopmentTasks(),
  update: (task: Parameters<ReturnType<typeof getRepository>['updateDevelopmentTask']>[0]) =>
    getRepository().updateDevelopmentTask(task),
};

export const ActivityService = {
  list: () => getRepository().listActivity(),
};

export const IntegrationService = {
  list: () => getRepository().listIntegrations(),
  async toggle(id: string) {
    const list = await getRepository().listIntegrations();
    const item = list.find((i) => i.id === id);
    if (!item) throw new Error('Integration not found');
    const next = {
      ...item,
      status:
        item.status === 'Connected' || item.status === 'Indexing'
          ? ('Disconnected' as const)
          : ('Connected' as const),
      lastSync:
        item.status === 'Connected' || item.status === 'Indexing'
          ? 'Never'
          : 'Just now',
    };
    await getRepository().updateIntegration(next);
    return next;
  },
};

export const SettingsService = {
  get: () => getRepository().getSettings(),
  update: (settings: Parameters<ReturnType<typeof getRepository>['updateSettings']>[0]) =>
    getRepository().updateSettings(settings),
  resetDemo: () => getRepository().resetDemo(),
};

export const SearchService = {
  search: (q: string) => getRepository().search(q),
};

export const InsightService = {
  list: () => getRepository().listInsights(),
};
