import { config } from '../lib/config';
import type {
  ChatAgentState,
  ChatMessage,
  DraftTask,
  FeatureRequest,
} from '../types';
import { getRepository } from './dataProvider';

export type AIAgentState =
  | 'idle'
  | 'thinking'
  | 'asking_question'
  | 'ready_to_finalize'
  | 'analyzing'
  | 'searching_knowledge'
  | 'analyzing_code'
  | 'generating_requirement'
  | 'ready'
  | 'finalized'
  | 'error';

export interface AIChatResponse {
  text: string;
  analysisCard?: ChatMessage['analysisCard'];
  state: AIAgentState;
  draftTask?: DraftTask;
}

function parseChatPayload(raw: unknown): AIChatResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.text !== 'string') return null;

  const state = (typeof data.state === 'string' ? data.state : 'ready') as AIAgentState;
  let draftTask: DraftTask | undefined;
  const draft = data.draftTask;
  if (draft && typeof draft === 'object') {
    const d = draft as Record<string, unknown>;
    if (typeof d.title === 'string' && typeof d.summary === 'string') {
      const effort =
        d.effort === 'Low' || d.effort === 'Medium' || d.effort === 'High'
          ? d.effort
          : 'Medium';
      draftTask = {
        title: d.title,
        summary: d.summary,
        acceptanceCriteria: Array.isArray(d.acceptanceCriteria)
          ? d.acceptanceCriteria.filter((c): c is string => typeof c === 'string')
          : [],
        effort,
      };
    }
  }

  return {
    text: data.text,
    state,
    draftTask,
    analysisCard: data.analysisCard as ChatMessage['analysisCard'] | undefined,
  };
}

function looksLikeNewTaskRequest(text: string): boolean {
  return /\b(create|add|build|implement|make|i need|we need|please (create|add|build)|new (task|ticket|request|page|feature))\b/i.test(
    text.trim()
  );
}

/** Keep only the active clarification thread so older demo topics cannot leak in. */
export function sliceActiveHistory(
  history: { role: 'user' | 'model'; text: string; state?: string }[],
  prompt: string
): { role: 'user' | 'model'; text: string }[] {
  const normalized = history.map((h) => ({
    role: h.role,
    text: h.text,
    state: h.state,
  }));

  if (looksLikeNewTaskRequest(prompt)) {
    const lastModel = [...normalized].reverse().find((h) => h.role === 'model');
    if (lastModel?.state !== 'asking_question') {
      return [];
    }
  }

  // Drop everything before the last finalized / ready_to_finalize turn
  let start = 0;
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (
      h.role === 'model' &&
      (h.state === 'finalized' || h.state === 'ready_to_finalize')
    ) {
      start = i + 1;
    }
  }

  return normalized.slice(start).map(({ role, text }) => ({ role, text }));
}

function titleFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/\b(into the jira|in jira|on jira|please|create|make a task for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || prompt.trim() || 'New client request';
  return base.length > 80 ? `${base.slice(0, 77).trim()}...` : base;
}

function buildDraftFromConversation(
  prompt: string,
  history: { role: 'user' | 'model'; text: string }[]
): DraftTask {
  // Latest user message is the task; prior user turns only fill in clarifications.
  const clarifyingBits = history
    .filter((h) => h.role === 'user')
    .map((h) => h.text.trim())
    .filter(Boolean);
  const summaryParts = [...clarifyingBits, prompt.trim()].filter(Boolean);
  const summary = summaryParts.join(' ').trim() || prompt;

  return {
    title: titleFromPrompt(prompt),
    summary,
    acceptanceCriteria: [
      'Behavior matches the agreed client description.',
      'Works on the platforms discussed with the client.',
      'Errors and empty states show clear user messaging.',
    ],
    effort: 'Medium',
  };
}

function offlineReply(
  prompt: string,
  history: { role: 'user' | 'model'; text: string }[] = []
): AIChatResponse {
  const lower = prompt.toLowerCase();
  const userTurns = history.filter((h) => h.role === 'user').length + 1;
  // Score readiness from the active thread only (already sliced by caller).
  const conversationText = [...history.map((h) => h.text), prompt]
    .join(' ')
    .toLowerCase();

  const hasActor =
    /\b(user|customer|client|admin|buyer|guest|i want|we need)\b/.test(
      conversationText
    );
  const hasPlatform =
    /\b(ios|android|web|mobile|flutter|desktop|app)\b/.test(conversationText);
  const hasGoal =
    /\b(pay|payment|checkout|login|search|notif|faster|integrat|add|support|enable|home|dashboard|page|feature|screen)\b/.test(
      conversationText
    );
  const explicitCreate =
    looksLikeNewTaskRequest(prompt) && prompt.trim().length >= 12;

  // Enough detail after a few turns, or a clear single create request
  if (
    explicitCreate ||
    (userTurns >= 3 && hasGoal) ||
    (userTurns >= 2 && hasGoal && (hasActor || hasPlatform)) ||
    (hasGoal && hasPlatform && prompt.length > 40)
  ) {
    return {
      state: 'ready_to_finalize',
      text: 'I have enough detail to create a Jira task. Please review the draft below and confirm to write it to Jira.',
      draftTask: buildDraftFromConversation(prompt, history),
    };
  }

  if (lower.includes('faster') || lower.includes('performance') || userTurns === 1) {
    if (userTurns === 1 && !hasPlatform) {
      return {
        state: 'asking_question',
        text: 'Got it. Which platform should this cover — iOS, Android, web, or all of them?',
      };
    }
    if (!hasActor) {
      return {
        state: 'asking_question',
        text: 'Who is the main user for this — end customers, admins, or internal staff?',
      };
    }
    return {
      state: 'asking_question',
      text: 'What should happen when it succeeds, and what should the user see if it fails?',
    };
  }

  if (!hasPlatform) {
    return {
      state: 'asking_question',
      text: 'Which platform should this cover — iOS, Android, web, or all of them?',
    };
  }

  if (!hasActor) {
    return {
      state: 'asking_question',
      text: 'Who is the main user for this — end customers, admins, or internal staff?',
    };
  }

  return {
    state: 'asking_question',
    text: 'What should the finished behavior look like for the user, including any edge cases?',
  };
}

export async function chatWithAI(params: {
  prompt: string;
  conversationId: string;
  history?: { role: 'user' | 'model'; text: string; state?: string }[];
}): Promise<AIChatResponse> {
  const history = sliceActiveHistory(params.history ?? [], params.prompt);
  try {
    const settings = await getRepository().getSettings();
    const res = await fetch(`${config.aiProxyUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        history,
        model: settings.geminiModel,
      }),
    });
    if (!res.ok) throw new Error(`AI proxy ${res.status}`);
    const data = (await res.json()) as unknown;
    const parsed = parseChatPayload(data);
    if (!parsed) throw new Error('Invalid AI chat payload');
    // Always ground the draft in the latest user request when finalizing
    if (parsed.state === 'ready_to_finalize') {
      const grounded = buildDraftFromConversation(params.prompt, history);
      if (!parsed.draftTask) {
        parsed.draftTask = grounded;
      } else {
        // Keep model ACs/effort when present, but never keep a title/summary
        // that ignores the current prompt (e.g. stale Apple Pay demo context).
        const promptTokens = params.prompt
          .toLowerCase()
          .split(/\W+/)
          .filter((t) => t.length > 3);
        const draftBlob =
          `${parsed.draftTask.title} ${parsed.draftTask.summary}`.toLowerCase();
        const overlap = promptTokens.filter((t) => draftBlob.includes(t)).length;
        if (promptTokens.length > 0 && overlap === 0) {
          parsed.draftTask = {
            title: grounded.title,
            summary: grounded.summary,
            effort: parsed.draftTask.effort || grounded.effort,
            acceptanceCriteria:
              parsed.draftTask.acceptanceCriteria.length > 0
                ? parsed.draftTask.acceptanceCriteria
                : grounded.acceptanceCriteria,
          };
        }
      }
    }
    return parsed;
  } catch {
    return offlineReply(params.prompt, history);
  }
}

export async function analyzeRequirement(promptText: string): Promise<FeatureRequest> {
  try {
    const settings = await getRepository().getSettings();
    const res = await fetch(`${config.aiProxyUrl}/api/ai/analyze-requirement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText, model: settings.geminiModel }),
    });
    if (res.ok) {
      return (await res.json()) as FeatureRequest;
    }
  } catch {
    // fall through to deterministic generator
  }

  const newReqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  return {
    id: newReqId,
    workspaceId: 'ws-CompanyBrain',
    projectId: 'prj-1',
    title: promptText.length > 40 ? `${promptText.slice(0, 40)}...` : promptText,
    subtitle: promptText,
    status: 'AI Analyzed',
    confidence: 92,
    objective: `Integrate ${promptText} into the existing CompanyBrain application architecture.`,
    businessGoal: 'Improve conversion and reduce manual support work.',
    productContext: [
      'REST backend services are in production.',
      'Stripe and authentication SDKs are pre-configured.',
    ],
    businessRequirements: promptText,
    acceptanceCriteria: [
      {
        id: '1',
        text: 'UI components render correctly on web and mobile.',
        completed: false,
      },
      {
        id: '2',
        text: 'Backend endpoints validate payloads and return success.',
        completed: false,
      },
      {
        id: '3',
        text: 'Failure states are handled with clear user messaging.',
        completed: false,
      },
    ],
    technicalImpactSummary:
      'Likely touches client controllers and related backend service endpoints.',
    aiRecommendation: {
      title: 'Proceed with implementation',
      description: 'Scope appears contained. Recommend PM review before development.',
    },
    matchedFiles: [
      {
        path: 'lib/services/payment_service.dart',
        matchPercentage: 90,
        description: 'Likely touchpoint for payment-related requests.',
        contentSnippet: `class PaymentService {\n  Future<void> handleNewRequest() async {\n    // ${promptText}\n  }\n}`,
      },
    ],
    devPlan: [
      {
        seq: '01',
        component: 'Backend (Node)',
        task: 'Create or extend API route and validation.',
        effort: 'Medium',
        jiraCreated: false,
      },
      {
        seq: '02',
        component: 'Frontend (Flutter)',
        task: 'Implement UI and state bindings.',
        effort: 'High',
        jiraCreated: false,
      },
      {
        seq: '03',
        component: 'QA',
        task: 'Add integration tests in sandbox.',
        effort: 'Medium',
        jiraCreated: false,
      },
    ],
    pmDecision: 'Pending',
    completeness: {
      businessRequirement: true,
      userActor: true,
      goal: true,
      expectedBehavior: true,
      platform: false,
      acceptanceCriteria: true,
      edgeCases: false,
      score: 78,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export type { ChatAgentState };
