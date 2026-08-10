import { create } from 'zustand';
import type {
  AIInsight,
  ChatMessage,
  CodeFile,
  ConnectedSource,
  Conversation,
  DevelopmentTask,
  DraftTask,
  FeatureRequest,
  Integration,
  JiraIssue,
  KnowledgeCategory,
  KnowledgeDocument,
  OverviewMetrics,
  Project,
  ActivityEvent,
  WorkspaceSettings,
  ClarificationAnswer,
  ClarificationSession,
} from '../types';
import {
  ActivityService,
  AIChatService,
  CodebaseService,
  DevelopmentService,
  InsightService,
  IntegrationService,
  JiraService,
  KnowledgeService,
  ProjectService,
  RequestService,
  SettingsService,
} from '../services';

interface WorkspaceState {
  loading: boolean;
  error: string | null;
  requests: FeatureRequest[];
  selectedRequestId: string | null;
  insights: AIInsight[];
  projects: Project[];
  metrics: OverviewMetrics | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  sources: ConnectedSource[];
  knowledge: KnowledgeCategory[];
  knowledgeDocuments: KnowledgeDocument[];
  jiraIssues: JiraIssue[];
  codeFiles: CodeFile[];
  developmentTasks: DevelopmentTask[];
  activity: ActivityEvent[];
  integrations: Integration[];
  settings: WorkspaceSettings | null;
  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
  bootstrap: (userId: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
  selectRequest: (id: string) => void;
  analyzeRequest: (prompt: string, actor: string) => Promise<FeatureRequest>;
  approveRequest: (id: string, actor: string) => Promise<void>;
  rejectRequest: (id: string, actor: string) => Promise<void>;
  requestMoreInfo: (id: string, actor: string) => Promise<void>;
  createJiraTasks: (id: string, actor: string) => Promise<void>;
  sendChat: (userId: string, text: string, actor: string) => Promise<void>;
  createChat: (userId: string) => Promise<void>;
  selectChat: (userId: string, conversationId: string) => Promise<void>;
  saveClarificationProgress: (
    messageId: string,
    clarification: ClarificationSession
  ) => Promise<void>;
  submitClarificationAnswers: (
    userId: string,
    actor: string,
    messageId: string,
    answers: Record<string, ClarificationAnswer>
  ) => Promise<void>;
  finalizeChatTask: (
    userId: string,
    actor: string,
    draftTask: DraftTask
  ) => Promise<{ jiraKey: string; requestId: string; jiraUrl?: string }>;
  toggleIntegration: (id: string) => Promise<void>;
  saveSettings: (settings: WorkspaceSettings) => Promise<void>;
  resetDemo: (userId: string) => Promise<void>;
  addKnowledgeDocument: (
    input: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'> & {
      workspaceId?: string;
    }
  ) => Promise<void>;
  deleteKnowledgeDocument: (id: string) => Promise<void>;
  updateDevTaskStatus: (
    id: string,
    status: DevelopmentTask['status']
  ) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  loading: false,
  error: null,
  requests: [],
  selectedRequestId: null,
  insights: [],
  projects: [],
  metrics: null,
  conversations: [],
  activeConversationId: null,
  messages: [],
  sources: [],
  knowledge: [],
  knowledgeDocuments: [],
  jiraIssues: [],
  codeFiles: [],
  developmentTasks: [],
  activity: [],
  integrations: [],
  settings: null,
  toast: null,
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 3000);
  },
  clearToast: () => set({ toast: null }),
  bootstrap: async (userId) => {
    set({ loading: true, error: null });
    try {
      const activeConversation = await AIChatService.getActiveConversation(userId);
      const [
        requests,
        insights,
        projects,
        metrics,
        conversations,
        messages,
        sources,
        knowledge,
        knowledgeDocuments,
        jiraIssues,
        codeFiles,
        developmentTasks,
        activity,
        integrations,
        settings,
      ] = await Promise.all([
        RequestService.list(),
        InsightService.list(),
        ProjectService.list(),
        RequestService.metrics(),
        AIChatService.listConversations(userId),
        AIChatService.listMessages(userId),
        KnowledgeService.sources(),
        KnowledgeService.categories(),
        KnowledgeService.documents(),
        JiraService.list(),
        CodebaseService.list(),
        DevelopmentService.list(),
        ActivityService.list(),
        IntegrationService.list(),
        SettingsService.get(),
      ]);
      set({
        requests,
        insights,
        projects,
        metrics,
        conversations,
        activeConversationId: activeConversation.id,
        messages,
        sources,
        knowledge,
        knowledgeDocuments,
        jiraIssues,
        codeFiles,
        developmentTasks,
        activity,
        integrations,
        settings,
        selectedRequestId: requests[0]?.id ?? null,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load workspace',
      });
    }
  },
  refreshRequests: async () => {
    const [requests, metrics] = await Promise.all([
      RequestService.list(),
      RequestService.metrics(),
    ]);
    set({ requests, metrics });
  },
  selectRequest: (id) => set({ selectedRequestId: id }),
  analyzeRequest: async (prompt, actor) => {
    const request = await RequestService.analyzeFromPrompt(prompt, actor);
    const [requests, metrics, activity] = await Promise.all([
      RequestService.list(),
      RequestService.metrics(),
      ActivityService.list(),
    ]);
    set({
      requests,
      metrics,
      activity,
      selectedRequestId: request.id,
    });
    get().showToast(`Analyzed ${request.id}: ${request.title}`);
    return request;
  },
  approveRequest: async (id, actor) => {
    await RequestService.pmDecision(id, 'Approved', actor);
    await get().refreshRequests();
    set({ activity: await ActivityService.list() });
    get().showToast(`Approved ${id} for development`);
  },
  rejectRequest: async (id, actor) => {
    await RequestService.pmDecision(id, 'Rejected', actor);
    await get().refreshRequests();
    set({ activity: await ActivityService.list() });
    get().showToast(`Rejected ${id}`);
  },
  requestMoreInfo: async (id, actor) => {
    await RequestService.pmDecision(id, 'Requested Info', actor);
    await get().refreshRequests();
    set({ activity: await ActivityService.list() });
    get().showToast(`Requested more information for ${id}`);
  },
  createJiraTasks: async (id, actor) => {
    const { issues } = await RequestService.createJiraTasks(id, actor);
    await get().refreshRequests();
    set({
      jiraIssues: await JiraService.list(),
      activity: await ActivityService.list(),
    });
    get().showToast(
      `Jira tasks ${issues.map((i) => i.key).join(', ')} created for ${id}`
    );
  },
  sendChat: async (userId, text, actor) => {
    const { userMsg, aiMsg, conversationId, conversations } = await AIChatService.send(
      userId,
      text,
      actor
    );
    set({
      messages: [...get().messages, userMsg, aiMsg],
      conversations,
      activeConversationId: conversationId,
    });
  },
  saveClarificationProgress: async (messageId, clarification) => {
    const updated = await AIChatService.updateClarificationProgress(messageId, clarification);
    set({
      messages: get().messages.map((m) => (m.id === messageId ? updated : m)),
    });
  },
  submitClarificationAnswers: async (userId, actor, messageId, answers) => {
    const { messages, conversations, conversationId } =
      await AIChatService.submitClarificationAnswers(userId, actor, messageId, answers);
    set({
      messages,
      conversations,
      activeConversationId: conversationId,
    });
  },
  createChat: async (userId) => {
    const conversation = await AIChatService.createConversation(userId);
    const conversations = await AIChatService.listConversations(userId);
    set({
      conversations,
      activeConversationId: conversation.id,
      messages: [],
    });
  },
  selectChat: async (userId, conversationId) => {
    const { messages } = await AIChatService.selectConversation(userId, conversationId);
    const conversations = await AIChatService.listConversations(userId);
    set({
      conversations,
      activeConversationId: conversationId,
      messages,
    });
  },
  finalizeChatTask: async (userId, actor, draftTask) => {
    try {
      const { request, issue, confirmMsg, jiraUrl } = await AIChatService.finalizeToJira(
        userId,
        actor,
        draftTask
      );
      const [requests, metrics, jiraIssues, activity, messages, conversations, activeConversation] =
        await Promise.all([
          RequestService.list(),
          RequestService.metrics(),
          JiraService.list(),
          ActivityService.list(),
          AIChatService.listMessages(userId),
          AIChatService.listConversations(userId),
          AIChatService.getActiveConversation(userId),
        ]);
      set({
        requests,
        metrics,
        jiraIssues,
        activity,
        messages,
        conversations,
        activeConversationId: activeConversation.id,
        selectedRequestId: request.id,
      });
      get().showToast(`${issue.key} created in real Jira`);
      if (!messages.some((m) => m.id === confirmMsg.id)) {
        set({ messages: [...get().messages, confirmMsg] });
      }
      return { jiraKey: issue.key, requestId: request.id, jiraUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create Jira issue';
      get().showToast(message);
      throw e;
    }
  },
  toggleIntegration: async (id) => {
    await IntegrationService.toggle(id);
    set({
      integrations: await IntegrationService.list(),
      sources: await KnowledgeService.sources(),
    });
    get().showToast('Integration updated');
  },
  saveSettings: async (settings) => {
    await SettingsService.update(settings);
    set({ settings });
    get().showToast('Settings saved');
  },
  resetDemo: async (userId) => {
    await SettingsService.resetDemo();
    await get().bootstrap(userId);
    get().showToast('Demo data reset');
  },
  addKnowledgeDocument: async (input) => {
    await KnowledgeService.addDocument({
      workspaceId: input.workspaceId ?? 'ws-CompanyBrain',
      categoryId: input.categoryId,
      title: input.title,
      notes: input.notes,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      content: input.content,
    });
    const [knowledge, knowledgeDocuments] = await Promise.all([
      KnowledgeService.categories(),
      KnowledgeService.documents(),
    ]);
    set({ knowledge, knowledgeDocuments });
    get().showToast(`Added “${input.title}” to knowledge`);
  },
  deleteKnowledgeDocument: async (id) => {
    await KnowledgeService.deleteDocument(id);
    const [knowledge, knowledgeDocuments] = await Promise.all([
      KnowledgeService.categories(),
      KnowledgeService.documents(),
    ]);
    set({ knowledge, knowledgeDocuments });
    get().showToast('Document removed');
  },
  updateDevTaskStatus: async (id, status) => {
    const task = get().developmentTasks.find((t) => t.id === id);
    if (!task) return;
    await DevelopmentService.update({ ...task, status });
    set({ developmentTasks: await DevelopmentService.list() });
  },
}));
