import type {
  ActivityEvent,
  AppDatabase,
  ChatMessage,
  CodeFile,
  Conversation,
  DevelopmentTask,
  FeatureRequest,
  Integration,
  JiraIssue,
  OverviewMetrics,
  Project,
  SearchResult,
  UserProfile,
  WorkspaceSettings,
} from '../types';

/** Shared persistence contract — localStorage today, Supabase when configured. */
export interface DataRepository {
  getDb(): Promise<AppDatabase>;
  resetDemo(): Promise<AppDatabase>;

  getUserByEmail(email: string): Promise<UserProfile | null>;
  getUserById(id: string): Promise<UserProfile | null>;
  listUsers(): Promise<UserProfile[]>;

  listRequests(): Promise<FeatureRequest[]>;
  getRequest(id: string): Promise<FeatureRequest | null>;
  upsertRequest(request: FeatureRequest): Promise<FeatureRequest>;

  listProjects(): Promise<Project[]>;
  listInsights(): Promise<AppDatabase['insights']>;
  listSources(): Promise<AppDatabase['sources']>;
  listKnowledge(): Promise<AppDatabase['knowledgeCategories']>;
  listKnowledgeDocuments(categoryId?: string): Promise<AppDatabase['knowledgeDocuments']>;
  addKnowledgeDocument(
    doc: Omit<AppDatabase['knowledgeDocuments'][number], 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  ): Promise<AppDatabase['knowledgeDocuments'][number]>;
  deleteKnowledgeDocument(id: string): Promise<void>;

  getOrCreateConversation(userId: string): Promise<Conversation>;
  listMessages(conversationId: string): Promise<ChatMessage[]>;
  appendMessages(messages: ChatMessage[]): Promise<void>;

  listJiraIssues(): Promise<JiraIssue[]>;
  upsertJiraIssues(issues: JiraIssue[]): Promise<void>;

  listCodeFiles(): Promise<CodeFile[]>;
  listDevelopmentTasks(): Promise<DevelopmentTask[]>;
  updateDevelopmentTask(task: DevelopmentTask): Promise<void>;

  listActivity(): Promise<ActivityEvent[]>;
  appendActivity(event: Omit<ActivityEvent, 'id' | 'createdAt'> & { id?: string }): Promise<void>;

  listIntegrations(): Promise<Integration[]>;
  updateIntegration(integration: Integration): Promise<void>;

  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(settings: WorkspaceSettings): Promise<void>;

  getMetrics(): Promise<OverviewMetrics>;
  search(query: string): Promise<SearchResult[]>;
}
