import { isSupabaseConfigured } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import type { FeatureRequest, UserProfile } from '../types';
import { localRepository } from './localRepository';
import type { DataRepository } from './repository';

/**
 * Supabase-backed repository. Falls back to local persistence when Supabase
 * is not configured or when a table query fails (free MVP safety net).
 */
async function withFallback<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

export const supabaseRepository: DataRepository = {
  async getDb() {
    return localRepository.getDb();
  },
  async resetDemo() {
    return localRepository.resetDemo();
  },
  async getUserByEmail(email) {
    const sb = getSupabase();
    if (!sb) return localRepository.getUserByEmail(email);
    return withFallback(async (): Promise<UserProfile | null> => {
      const { data, error } = await sb.from('profiles').select('*').eq('email', email).maybeSingle();
      if (error || !data) throw error ?? new Error('not found');
      return {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        role: data.role,
        avatarUrl: data.avatar_url ?? undefined,
        workspaceId: data.workspace_id,
      };
    }, () => localRepository.getUserByEmail(email));
  },
  async getUserById(id) {
    return localRepository.getUserById(id);
  },
  async listUsers() {
    return localRepository.listUsers();
  },
  async listRequests() {
    const sb = getSupabase();
    if (!sb) return localRepository.listRequests();
    return withFallback(async (): Promise<FeatureRequest[]> => {
      const { data, error } = await sb.from('requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        projectId: row.project_id ?? undefined,
        title: row.title,
        subtitle: row.subtitle ?? '',
        status: row.status,
        confidence: row.confidence ?? undefined,
        objective: row.objective ?? undefined,
        businessGoal: row.business_goal ?? undefined,
        productContext: row.product_context ?? undefined,
        businessRequirements: row.business_requirements ?? undefined,
        acceptanceCriteria: row.acceptance_criteria ?? undefined,
        technicalImpactSummary: row.technical_impact_summary ?? undefined,
        aiRecommendation: row.ai_recommendation ?? undefined,
        matchedFiles: row.matched_files ?? undefined,
        devPlan: row.dev_plan ?? undefined,
        pmDecision: row.pm_decision ?? undefined,
        jiraKey: row.jira_key ?? undefined,
        completeness: row.completeness ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? undefined,
      }));
    }, () => localRepository.listRequests());
  },
  async getRequest(id) {
    const requests = await this.listRequests();
    return requests.find((r) => r.id === id) ?? null;
  },
  async upsertRequest(request) {
    const sb = getSupabase();
    if (!sb) return localRepository.upsertRequest(request);
    return withFallback(async (): Promise<FeatureRequest> => {
      const payload = {
        id: request.id,
        workspace_id: request.workspaceId,
        project_id: request.projectId ?? null,
        title: request.title,
        subtitle: request.subtitle,
        status: request.status,
        confidence: request.confidence ?? null,
        objective: request.objective ?? null,
        business_goal: request.businessGoal ?? null,
        product_context: request.productContext ?? null,
        business_requirements: request.businessRequirements ?? null,
        acceptance_criteria: request.acceptanceCriteria ?? null,
        technical_impact_summary: request.technicalImpactSummary ?? null,
        ai_recommendation: request.aiRecommendation ?? null,
        matched_files: request.matchedFiles ?? null,
        dev_plan: request.devPlan ?? null,
        pm_decision: request.pmDecision ?? null,
        jira_key: request.jiraKey ?? null,
        completeness: request.completeness ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from('requests').upsert(payload);
      if (error) throw error;
      return request;
    }, () => localRepository.upsertRequest(request));
  },
  listProjects: (...args) => localRepository.listProjects(...args),
  listInsights: (...args) => localRepository.listInsights(...args),
  listSources: (...args) => localRepository.listSources(...args),
  listKnowledge: (...args) => localRepository.listKnowledge(...args),
  listKnowledgeDocuments: (...args) => localRepository.listKnowledgeDocuments(...args),
  addKnowledgeDocument: (...args) => localRepository.addKnowledgeDocument(...args),
  deleteKnowledgeDocument: (...args) => localRepository.deleteKnowledgeDocument(...args),
  getOrCreateConversation: (...args) => localRepository.getOrCreateConversation(...args),
  listMessages: (...args) => localRepository.listMessages(...args),
  appendMessages: (...args) => localRepository.appendMessages(...args),
  listJiraIssues: (...args) => localRepository.listJiraIssues(...args),
  upsertJiraIssues: (...args) => localRepository.upsertJiraIssues(...args),
  listCodeFiles: (...args) => localRepository.listCodeFiles(...args),
  listDevelopmentTasks: (...args) => localRepository.listDevelopmentTasks(...args),
  updateDevelopmentTask: (...args) => localRepository.updateDevelopmentTask(...args),
  listActivity: (...args) => localRepository.listActivity(...args),
  appendActivity: (...args) => localRepository.appendActivity(...args),
  listIntegrations: (...args) => localRepository.listIntegrations(...args),
  updateIntegration: (...args) => localRepository.updateIntegration(...args),
  getSettings: (...args) => localRepository.getSettings(...args),
  updateSettings: (...args) => localRepository.updateSettings(...args),
  getMetrics: (...args) => localRepository.getMetrics(...args),
  search: (...args) => localRepository.search(...args),
};

export function getRepository(): DataRepository {
  return isSupabaseConfigured ? supabaseRepository : localRepository;
}
