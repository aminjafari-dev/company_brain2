import { create } from 'zustand';
import type {
  AIInsight,
  ChatMessage,
  CodeFile,
  ConnectedSource,
  DevelopmentTask,
  FeatureRequest,
  Integration,
  JiraIssue,
  KnowledgeCategory,
  OverviewMetrics,
  Project,
  ActivityEvent,
  WorkspaceSettings,
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
  messages: ChatMessage[];
  sources: ConnectedSource[];
  knowledge: KnowledgeCategory[];
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
  toggleIntegration: (id: string) => Promise<void>;
  saveSettings: (settings: WorkspaceSettings) => Promise<void>;
  resetDemo: (userId: string) => Promise<void>;
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
  messages: [],
  sources: [],
  knowledge: [],
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
      const [
        requests,
        insights,
        projects,
        metrics,
        messages,
        sources,
        knowledge,
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
        AIChatService.listMessages(userId),
        KnowledgeService.sources(),
        KnowledgeService.categories(),
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
        messages,
        sources,
        knowledge,
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
    const { userMsg, aiMsg } = await AIChatService.send(userId, text, actor);
    set({ messages: [...get().messages, userMsg, aiMsg] });
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
  updateDevTaskStatus: async (id, status) => {
    const task = get().developmentTasks.find((t) => t.id === id);
    if (!task) return;
    await DevelopmentService.update({ ...task, status });
    set({ developmentTasks: await DevelopmentService.list() });
  },
}));
