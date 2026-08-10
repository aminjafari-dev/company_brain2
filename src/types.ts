export type TabType =
  | 'overview'
  | 'ai-assistant'
  | 'requests'
  | 'new-request'
  | 'projects'
  | 'jira'
  | 'codebase'
  | 'knowledge'
  | 'development'
  | 'activity'
  | 'integrations'
  | 'settings';

export type UserRole = 'client' | 'pm' | 'developer' | 'admin';

export type RequestStatus =
  | 'Draft'
  | 'AI Gathering Information'
  | 'AI Analysis'
  | 'New Request'
  | 'AI Analyzed'
  | 'Ready for Review'
  | 'Ready for PM Review'
  | 'PM Review'
  | 'Approved'
  | 'Rejected'
  | 'Development Planning'
  | 'In Development'
  | 'QA'
  | 'Completed';

export type IntegrationStatus = 'Connected' | 'Disconnected' | 'Indexing' | 'Error';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  workspaceId: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  repo: string;
  status: string;
  progress: number;
  lead: string;
  requestsCount: number;
  stack: string[];
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  completed: boolean;
}

export interface MatchedFile {
  path: string;
  matchPercentage: number;
  description: string;
  contentSnippet?: string;
}

export interface DevTask {
  seq: string;
  component: string;
  task: string;
  effort: 'Low' | 'Medium' | 'High';
  jiraCreated?: boolean;
}

export interface RequirementCompleteness {
  businessRequirement: boolean;
  userActor: boolean;
  goal: boolean;
  expectedBehavior: boolean;
  platform: boolean;
  acceptanceCriteria: boolean;
  edgeCases: boolean;
  score: number;
}

export interface FeatureRequest {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  subtitle: string;
  status: RequestStatus;
  confidence?: number;
  objective?: string;
  businessGoal?: string;
  productContext?: string[];
  businessRequirements?: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  technicalImpactSummary?: string;
  aiRecommendation?: {
    title: string;
    description: string;
  };
  matchedFiles?: MatchedFile[];
  devPlan?: DevTask[];
  pmDecision?: 'Approved' | 'Requested Info' | 'Rejected' | 'Pending';
  jiraKey?: string;
  completeness?: RequirementCompleteness;
  createdAt: string;
  updatedAt?: string;
}

export interface AIInsight {
  id: string;
  workspaceId: string;
  type: 'Potential Duplicate' | 'Technical Impact' | 'Security Alert';
  title: string;
  description: string;
  relatedJira?: {
    key: string;
    title: string;
  };
  impactModulesCount?: number;
}

export interface ConnectedSource {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  lastSync: string;
  status: IntegrationStatus;
  progress?: number;
}

export interface KnowledgeCategory {
  id: string;
  workspaceId: string;
  title: string;
  icon: string;
  description: string;
  documentCount: number;
}

/** Manually added knowledge for a category (docs, notes, pasted content). */
export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  categoryId: string;
  title: string;
  notes?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  /** Text content from upload or paste (binary files may omit this). */
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftTask {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  effort: 'Low' | 'Medium' | 'High';
}

export type ChatAgentState =
  | 'asking_question'
  | 'ready_to_finalize'
  | 'ready'
  | 'finalized'
  | 'error';

/** How the AI chose to respond for this turn. */
export type ChatResponseMode = 'chat' | 'clarify' | 'task_ready';

export interface ClarifyingOption {
  id: string;
  label: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  /** Exactly three concrete choices; UI also offers a custom answer. */
  options: ClarifyingOption[];
}

export interface ClarificationAnswer {
  optionId?: string;
  customText?: string;
}

export interface ClarificationSession {
  intro: string;
  questions: ClarifyingQuestion[];
  answers?: Record<string, ClarificationAnswer>;
  /** 0-based index of the question currently shown. */
  currentIndex?: number;
  status: 'in_progress' | 'completed';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  state?: ChatAgentState;
  mode?: ChatResponseMode;
  clarification?: ClarificationSession;
  draftTask?: DraftTask;
  jiraKey?: string;
  jiraUrl?: string;
  analysisCard?: {
    title: string;
    status: string;
    summary: string;
    affectedSystems: string[];
    relatedJira?: string;
    estComplexity: string;
  };
}

export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string;
  projectId?: string;
  title: string;
  status: 'active' | 'archived';
  relatedRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JiraIssue {
  id: string;
  workspaceId: string;
  key: string;
  summary: string;
  status: string;
  assignee: string;
  type: string;
  linkedReq?: string;
}

export interface CodeFile {
  id: string;
  workspaceId: string;
  path: string;
  language: string;
  lines: number;
  module: string;
  lastAnalyzed: string;
  contentSnippet?: string;
}

export interface DevelopmentTask {
  id: string;
  workspaceId: string;
  title: string;
  project: string;
  developer: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Ready' | 'In Development' | 'Blocked' | 'Code Review' | 'QA' | 'Completed';
  aiGenerated: boolean;
  requestId?: string;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  lastSync: string;
  icon: string;
}

export interface NotificationItem {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface OverviewMetrics {
  newRequests: number;
  aiAnalyzed: number;
  waitingForPm: number;
  inDevelopment: number;
  completed: number;
}

export interface SearchResult {
  id: string;
  type: 'project' | 'request' | 'jira' | 'code' | 'documentation' | 'client' | 'person';
  title: string;
  subtitle: string;
  tab?: TabType;
}

export interface WorkspaceSettings {
  workspaceId: string;
  aiAutonomy: 'Suggest Only' | 'Require Approval' | 'Automatic';
  geminiModel: string;
  syncIntervalMinutes: number;
}

export interface AppDatabase {
  version: number;
  workspace: Workspace;
  users: UserProfile[];
  projects: Project[];
  requests: FeatureRequest[];
  insights: AIInsight[];
  sources: ConnectedSource[];
  knowledgeCategories: KnowledgeCategory[];
  knowledgeDocuments: KnowledgeDocument[];
  conversations: Conversation[];
  messages: ChatMessage[];
  jiraIssues: JiraIssue[];
  codeFiles: CodeFile[];
  developmentTasks: DevelopmentTask[];
  activity: ActivityEvent[];
  integrations: Integration[];
  notifications: NotificationItem[];
  settings: WorkspaceSettings;
}

export type AsyncState = 'idle' | 'loading' | 'success' | 'error';
