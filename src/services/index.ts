import type {
  FeatureRequest,
  JiraIssue,
  OverviewMetrics,
  RequestStatus,
} from '../types';
import { analyzeRequirement, chatWithAI } from './aiService';
import { getRepository } from './dataProvider';
import { WORKSPACE_ID } from '../data/seed';

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
