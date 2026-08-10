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
import { WORKSPACE_ID } from '../data/seed';
import { loadDatabase, resetDatabase, updateDatabase } from '../data/localStore';
import type { DataRepository } from './repository';

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function computeMetrics(db: AppDatabase): OverviewMetrics {
  const newRequests = db.requests.filter((r) =>
    ['New Request', 'Draft', 'AI Gathering Information'].includes(r.status)
  ).length;
  const aiAnalyzed = db.requests.filter((r) =>
    ['AI Analyzed', 'AI Analysis', 'Ready for Review', 'Ready for PM Review', 'PM Review'].includes(
      r.status
    )
  ).length;
  const waitingForPm = db.requests.filter((r) =>
    ['Ready for PM Review', 'Ready for Review', 'PM Review'].includes(r.status)
  ).length;
  const inDevelopment = db.requests.filter((r) =>
    ['In Development', 'Development Planning', 'Approved', 'QA'].includes(r.status)
  ).length;
  const completed = db.requests.filter((r) => r.status === 'Completed').length;
  return { newRequests, aiAnalyzed, waitingForPm, inDevelopment, completed };
}

export const localRepository: DataRepository = {
  async getDb() {
    return delay(loadDatabase());
  },

  async resetDemo() {
    return delay(resetDatabase());
  },

  async getUserByEmail(email) {
    const db = loadDatabase();
    return delay(db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null);
  },

  async getUserById(id) {
    const db = loadDatabase();
    return delay(db.users.find((u) => u.id === id) ?? null);
  },

  async listUsers() {
    return delay(loadDatabase().users);
  },

  async listRequests() {
    return delay([...loadDatabase().requests]);
  },

  async getRequest(id) {
    return delay(loadDatabase().requests.find((r) => r.id === id) ?? null);
  },

  async upsertRequest(request) {
    updateDatabase((db) => {
      const idx = db.requests.findIndex((r) => r.id === request.id);
      if (idx >= 0) db.requests[idx] = request;
      else db.requests.unshift(request);
    });
    return delay(request);
  },

  async listProjects() {
    return delay([...loadDatabase().projects] as Project[]);
  },

  async listInsights() {
    return delay([...loadDatabase().insights]);
  },

  async listSources() {
    return delay([...loadDatabase().sources]);
  },

  async listKnowledge() {
    const db = loadDatabase();
    const counts = new Map<string, number>();
    for (const doc of db.knowledgeDocuments ?? []) {
      counts.set(doc.categoryId, (counts.get(doc.categoryId) ?? 0) + 1);
    }
    return delay(
      db.knowledgeCategories.map((cat) => ({
        ...cat,
        documentCount: counts.get(cat.id) ?? 0,
      }))
    );
  },

  async listKnowledgeDocuments(categoryId) {
    const docs = loadDatabase().knowledgeDocuments ?? [];
    const filtered = categoryId ? docs.filter((d) => d.categoryId === categoryId) : docs;
    return delay(
      [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  },

  async addKnowledgeDocument(input) {
    const now = new Date().toISOString();
    const doc = {
      id: input.id ?? `kdoc-${Date.now()}`,
      workspaceId: input.workspaceId,
      categoryId: input.categoryId,
      title: input.title,
      notes: input.notes,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
    updateDatabase((db) => {
      if (!db.knowledgeDocuments) db.knowledgeDocuments = [];
      db.knowledgeDocuments.unshift(doc);
      const cat = db.knowledgeCategories.find((c) => c.id === doc.categoryId);
      if (cat) {
        cat.documentCount = db.knowledgeDocuments.filter(
          (d) => d.categoryId === doc.categoryId
        ).length;
      }
    });
    return delay(doc);
  },

  async deleteKnowledgeDocument(id) {
    updateDatabase((db) => {
      if (!db.knowledgeDocuments) db.knowledgeDocuments = [];
      const existing = db.knowledgeDocuments.find((d) => d.id === id);
      db.knowledgeDocuments = db.knowledgeDocuments.filter((d) => d.id !== id);
      if (existing) {
        const cat = db.knowledgeCategories.find((c) => c.id === existing.categoryId);
        if (cat) {
          cat.documentCount = db.knowledgeDocuments.filter(
            (d) => d.categoryId === existing.categoryId
          ).length;
        }
      }
    });
    await delay(undefined);
  },

  async getOrCreateConversation(userId) {
    const db = loadDatabase();
    let conv = db.conversations.find((c) => c.userId === userId && c.status === 'active');
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        workspaceId: WORKSPACE_ID,
        userId,
        title: 'New conversation',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateDatabase((d) => {
        d.conversations.unshift(conv!);
      });
    }
    return delay(conv);
  },

  async listMessages(conversationId) {
    return delay(loadDatabase().messages.filter((m) => m.conversationId === conversationId));
  },

  async appendMessages(messages) {
    updateDatabase((db) => {
      db.messages.push(...messages);
      const convId = messages[0]?.conversationId;
      if (convId) {
        const conv = db.conversations.find((c) => c.id === convId);
        if (conv) conv.updatedAt = new Date().toISOString();
      }
    });
    await delay(undefined);
  },

  async listJiraIssues() {
    return delay([...loadDatabase().jiraIssues]);
  },

  async upsertJiraIssues(issues) {
    updateDatabase((db) => {
      for (const issue of issues) {
        const idx = db.jiraIssues.findIndex((j) => j.id === issue.id || j.key === issue.key);
        if (idx >= 0) db.jiraIssues[idx] = issue;
        else db.jiraIssues.unshift(issue);
      }
    });
    await delay(undefined);
  },

  async listCodeFiles() {
    return delay([...loadDatabase().codeFiles] as CodeFile[]);
  },

  async listDevelopmentTasks() {
    return delay([...loadDatabase().developmentTasks]);
  },

  async updateDevelopmentTask(task) {
    updateDatabase((db) => {
      const idx = db.developmentTasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) db.developmentTasks[idx] = task;
    });
    await delay(undefined);
  },

  async listActivity() {
    return delay([...loadDatabase().activity]);
  },

  async appendActivity(event) {
    const full: ActivityEvent = {
      id: event.id ?? `act-${Date.now()}`,
      workspaceId: event.workspaceId,
      actor: event.actor,
      action: event.action,
      target: event.target,
      detail: event.detail,
      createdAt: new Date().toISOString(),
    };
    updateDatabase((db) => {
      db.activity.unshift(full);
    });
    await delay(undefined);
  },

  async listIntegrations() {
    return delay([...loadDatabase().integrations]);
  },

  async updateIntegration(integration) {
    updateDatabase((db) => {
      const idx = db.integrations.findIndex((i) => i.id === integration.id);
      if (idx >= 0) db.integrations[idx] = integration;
      const source = db.sources.find((s) => s.name === integration.name);
      if (source) {
        source.status = integration.status === 'Disconnected' ? 'Disconnected' : integration.status;
        source.lastSync = `Sync: ${integration.lastSync}`;
      }
    });
    await delay(undefined);
  },

  async getSettings() {
    return delay(loadDatabase().settings);
  },

  async updateSettings(settings) {
    updateDatabase((db) => {
      db.settings = settings;
    });
    await delay(settings);
  },

  async getMetrics() {
    return delay(computeMetrics(loadDatabase()));
  },

  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return delay([]);
    const db = loadDatabase();
    const results: SearchResult[] = [];

    for (const p of db.projects) {
      if (p.name.toLowerCase().includes(q) || p.repo.toLowerCase().includes(q)) {
        results.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: p.repo,
          tab: 'projects',
        });
      }
    }
    for (const r of db.requests) {
      if (r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)) {
        results.push({
          id: r.id,
          type: 'request',
          title: r.title,
          subtitle: r.id,
          tab: 'requests',
        });
      }
    }
    for (const j of db.jiraIssues) {
      if (j.key.toLowerCase().includes(q) || j.summary.toLowerCase().includes(q)) {
        results.push({
          id: j.id,
          type: 'jira',
          title: j.key,
          subtitle: j.summary,
          tab: 'jira',
        });
      }
    }
    for (const f of db.codeFiles) {
      if (f.path.toLowerCase().includes(q) || f.module.toLowerCase().includes(q)) {
        results.push({
          id: f.id,
          type: 'code',
          title: f.path,
          subtitle: f.module,
          tab: 'codebase',
        });
      }
    }
    for (const u of db.users) {
      if (u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        results.push({
          id: u.id,
          type: 'person',
          title: u.displayName,
          subtitle: u.role,
          tab: 'settings',
        });
      }
    }
    results.push({
      id: 'client-CompanyBrain',
      type: 'client',
      title: 'CompanyBrain',
      subtitle: 'Primary client workspace',
      tab: 'projects',
    });

    return delay(results.slice(0, 20));
  },
};

// silence unused import warning for UserProfile in some TS configs
export type { UserProfile, Conversation, FeatureRequest, DevelopmentTask, Integration, JiraIssue };
