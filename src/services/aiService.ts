import { config } from '../lib/config';
import type {
  ChatAgentState,
  ChatMessage,
  ChatResponseMode,
  ClarificationAnswer,
  ClarificationSession,
  ClarifyingQuestion,
  DraftTask,
  FeatureRequest,
} from '../types';
import { getRepository } from './dataProvider';
import { buildKnowledgeContext } from './knowledgeContext';

async function loadKnowledgeContext(prompt: string) {
  const repo = getRepository();
  const [documents, categories] = await Promise.all([
    repo.listKnowledgeDocuments(),
    repo.listKnowledge(),
  ]);
  return buildKnowledgeContext({ prompt, documents, categories });
}

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
  mode: ChatResponseMode;
  draftTask?: DraftTask;
  clarification?: ClarificationSession;
}

function modeFromState(state: string): ChatResponseMode {
  if (state === 'ready_to_finalize') return 'task_ready';
  if (state === 'asking_question') return 'clarify';
  return 'chat';
}

function stateFromMode(mode: ChatResponseMode): ChatAgentState {
  if (mode === 'task_ready') return 'ready_to_finalize';
  if (mode === 'clarify') return 'asking_question';
  return 'ready';
}

function parseDraftTask(raw: unknown): DraftTask | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  if (typeof d.title !== 'string' || typeof d.summary !== 'string') return undefined;
  const effort =
    d.effort === 'Low' || d.effort === 'Medium' || d.effort === 'High' ? d.effort : 'Medium';
  return {
    title: d.title,
    summary: d.summary,
    acceptanceCriteria: Array.isArray(d.acceptanceCriteria)
      ? d.acceptanceCriteria.filter((c): c is string => typeof c === 'string')
      : [],
    effort,
  };
}

function parseClarification(raw: unknown, fallbackText: string): ClarificationSession | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.questions) || data.questions.length === 0) return undefined;

  const questions: ClarifyingQuestion[] = [];
  for (const q of data.questions.slice(0, 5)) {
    if (!q || typeof q !== 'object') continue;
    const item = q as Record<string, unknown>;
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    if (!prompt) continue;
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions
      .map((opt, idx) => {
        if (!opt || typeof opt !== 'object') return null;
        const o = opt as Record<string, unknown>;
        const label = typeof o.label === 'string' ? o.label.trim() : '';
        if (!label) return null;
        const id =
          typeof o.id === 'string' && o.id.trim()
            ? o.id.trim()
            : (['a', 'b', 'c'][idx] ?? `opt-${idx}`);
        return { id, label };
      })
      .filter((o): o is { id: string; label: string } => Boolean(o))
      .slice(0, 3);

    while (options.length < 3) {
      const filler = ['Not sure yet', 'Need more discussion', 'Other approach'][options.length];
      options.push({ id: ['a', 'b', 'c'][options.length], label: filler });
    }

    questions.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q${questions.length + 1}`,
      prompt,
      options,
    });
  }

  if (questions.length === 0) return undefined;

  return {
    intro:
      typeof data.intro === 'string' && data.intro.trim()
        ? data.intro.trim()
        : fallbackText || 'I need a few details before drafting the task.',
    questions,
    answers: {},
    currentIndex: 0,
    status: 'in_progress',
  };
}

function parseChatPayload(raw: unknown): AIChatResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.text !== 'string') return null;

  const explicitMode =
    data.mode === 'chat' || data.mode === 'clarify' || data.mode === 'task_ready'
      ? data.mode
      : null;
  const stateRaw = typeof data.state === 'string' ? data.state : 'ready';
  const mode = explicitMode ?? modeFromState(stateRaw);
  const state = (explicitMode ? stateFromMode(explicitMode) : stateRaw) as AIAgentState;
  const draftTask = parseDraftTask(data.draftTask);
  const clarification =
    mode === 'clarify' ? parseClarification(data.clarification, data.text) : undefined;

  // If model claimed clarify but forgot questions, degrade to chat.
  if (mode === 'clarify' && !clarification) {
    return {
      text: data.text,
      state: 'ready',
      mode: 'chat',
      analysisCard: data.analysisCard as ChatMessage['analysisCard'] | undefined,
    };
  }

  return {
    text: data.text,
    state: mode === 'clarify' ? 'asking_question' : mode === 'task_ready' ? 'ready_to_finalize' : state,
    mode,
    draftTask: mode === 'task_ready' ? draftTask : undefined,
    clarification,
    analysisCard: data.analysisCard as ChatMessage['analysisCard'] | undefined,
  };
}

function looksLikeNewTaskRequest(text: string): boolean {
  return /\b(create|add|build|implement|make|i need|we need|please (create|add|build)|new (task|ticket|request|page|feature))\b/i.test(
    text.trim()
  );
}

function looksLikeInformational(text: string): boolean {
  return /^(what|why|how|when|where|who|explain|tell me|describe|can you (explain|tell)|help me understand)\b/i.test(
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

export function formatClarificationAnswersForPrompt(
  originalRequest: string,
  session: ClarificationSession,
  answers: Record<string, ClarificationAnswer>
): string {
  const lines = session.questions.map((q, idx) => {
    const answer = answers[q.id];
    let resolved = '';
    if (answer?.customText?.trim()) {
      resolved = answer.customText.trim();
    } else if (answer?.optionId) {
      resolved = q.options.find((o) => o.id === answer.optionId)?.label ?? answer.optionId;
    } else {
      resolved = '(no answer)';
    }
    return `${idx + 1}. ${q.prompt}\n   Answer: ${resolved}`;
  });

  return [
    'Please create a complete Jira task from this intake.',
    '',
    `Original request: ${originalRequest}`,
    '',
    'Clarification answers:',
    ...lines,
    '',
    'Return mode "task_ready" with a full draftTask. Do not ask more questions.',
  ].join('\n');
}

function defaultClarifySession(knowledgeHint: string): ClarificationSession {
  return {
    intro: `I need a few details before drafting the Jira task.${knowledgeHint}`,
    questions: [
      {
        id: 'q1',
        prompt: 'Which platform should this cover?',
        options: [
          { id: 'a', label: 'iOS only' },
          { id: 'b', label: 'Android only' },
          { id: 'c', label: 'Web / all platforms' },
        ],
      },
      {
        id: 'q2',
        prompt: 'Who is the primary user?',
        options: [
          { id: 'a', label: 'End customers' },
          { id: 'b', label: 'Admins / internal staff' },
          { id: 'c', label: 'Both customers and staff' },
        ],
      },
      {
        id: 'q3',
        prompt: 'What should happen when it succeeds or fails?',
        options: [
          { id: 'a', label: 'Show success screen; clear error message on failure' },
          { id: 'b', label: 'Silent success; retry prompt on failure' },
          { id: 'c', label: 'Email confirmation; support contact on failure' },
        ],
      },
    ],
    answers: {},
    currentIndex: 0,
    status: 'in_progress',
  };
}

function offlineReply(
  prompt: string,
  history: { role: 'user' | 'model'; text: string }[] = [],
  knowledgeTitles: string[] = [],
  forceTaskReady = false
): AIChatResponse {
  const conversationText = [...history.map((h) => h.text), prompt].join(' ').toLowerCase();
  const knowledgeHint =
    knowledgeTitles.length > 0
      ? ` Related company knowledge: ${knowledgeTitles.slice(0, 2).join(', ')}${
          knowledgeTitles.length > 2 ? ', and more' : ''
        }.`
      : '';

  if (forceTaskReady) {
    return {
      mode: 'task_ready',
      state: 'ready_to_finalize',
      text: `I have enough detail to create a Jira task. Review the draft below and confirm to write it to Jira.${knowledgeHint}`,
      draftTask: buildDraftFromConversation(prompt, history),
    };
  }

  if (looksLikeInformational(prompt) && !looksLikeNewTaskRequest(prompt)) {
    return {
      mode: 'chat',
      state: 'ready',
      text:
        knowledgeTitles.length > 0
          ? `Based on your company knowledge (${knowledgeTitles.slice(0, 2).join(', ')}), here is what I can share: the local AI proxy is offline, so this is a lightweight summary. Re-ask once the proxy is online for a grounded answer from those documents.`
          : 'I can help with that. The AI proxy is offline right now, so start the local AI server for a full answer — or describe a feature you want built and I can draft a Jira task offline.',
    };
  }

  const hasActor = /\b(user|customer|client|admin|buyer|guest|i want|we need)\b/.test(
    conversationText
  );
  const hasPlatform = /\b(ios|android|web|mobile|flutter|desktop|app)\b/.test(conversationText);
  const hasGoal =
    /\b(pay|payment|checkout|login|search|notif|faster|integrat|add|support|enable|home|dashboard|page|feature|screen)\b/.test(
      conversationText
    );
  const explicitCreate = looksLikeNewTaskRequest(prompt) && prompt.trim().length >= 12;
  const completeEnough =
    (hasGoal && hasPlatform && hasActor) ||
    (explicitCreate && hasPlatform && prompt.length > 60) ||
    (hasGoal && hasPlatform && prompt.length > 80);

  if (completeEnough) {
    return {
      mode: 'task_ready',
      state: 'ready_to_finalize',
      text: `I have enough detail to create a Jira task. Review the draft below and confirm to write it to Jira.${knowledgeHint}`,
      draftTask: buildDraftFromConversation(prompt, history),
    };
  }

  if (looksLikeNewTaskRequest(prompt) || hasGoal) {
    const clarification = defaultClarifySession(knowledgeHint);
    return {
      mode: 'clarify',
      state: 'asking_question',
      text: clarification.intro,
      clarification,
    };
  }

  return {
    mode: 'chat',
    state: 'ready',
    text: `Happy to help.${knowledgeHint || ' Ask me anything about your product, or describe a feature to turn into a Jira task.'}`,
  };
}

function groundDraftTask(
  parsed: AIChatResponse,
  prompt: string,
  history: { role: 'user' | 'model'; text: string }[]
): AIChatResponse {
  if (parsed.mode !== 'task_ready') return parsed;
  const grounded = buildDraftFromConversation(prompt, history);
  if (!parsed.draftTask) {
    return { ...parsed, draftTask: grounded, state: 'ready_to_finalize' };
  }
  const promptTokens = prompt
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  const draftBlob = `${parsed.draftTask.title} ${parsed.draftTask.summary}`.toLowerCase();
  const overlap = promptTokens.filter((t) => draftBlob.includes(t)).length;
  if (promptTokens.length > 0 && overlap === 0) {
    return {
      ...parsed,
      state: 'ready_to_finalize',
      draftTask: {
        title: grounded.title,
        summary: grounded.summary,
        effort: parsed.draftTask.effort || grounded.effort,
        acceptanceCriteria:
          parsed.draftTask.acceptanceCriteria.length > 0
            ? parsed.draftTask.acceptanceCriteria
            : grounded.acceptanceCriteria,
      },
    };
  }
  return { ...parsed, state: 'ready_to_finalize' };
}

export async function chatWithAI(params: {
  prompt: string;
  conversationId: string;
  history?: { role: 'user' | 'model'; text: string; state?: string }[];
  /** When set, force a task_ready draft from clarification answers. */
  forceTaskReady?: boolean;
}): Promise<AIChatResponse> {
  const history = sliceActiveHistory(params.history ?? [], params.prompt);
  const knowledge = await loadKnowledgeContext(params.prompt);
  const forceTaskReady = Boolean(params.forceTaskReady);

  try {
    const settings = await getRepository().getSettings();
    const res = await fetch(`${config.aiProxyUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        history,
        model: settings.geminiModel,
        knowledgeContext: knowledge.contextText || undefined,
        forceTaskReady: forceTaskReady || undefined,
      }),
    });
    if (!res.ok) throw new Error(`AI proxy ${res.status}`);
    const data = (await res.json()) as unknown;
    const parsed = parseChatPayload(data);
    if (!parsed) throw new Error('Invalid AI chat payload');
    if (forceTaskReady && parsed.mode !== 'task_ready') {
      return offlineReply(
        params.prompt,
        history,
        knowledge.hits.map((h) => h.document.title),
        true
      );
    }
    return groundDraftTask(parsed, params.prompt, history);
  } catch {
    return offlineReply(
      params.prompt,
      history,
      knowledge.hits.map((h) => h.document.title),
      forceTaskReady
    );
  }
}

export async function analyzeRequirement(promptText: string): Promise<FeatureRequest> {
  const knowledge = await loadKnowledgeContext(promptText);
  try {
    const settings = await getRepository().getSettings();
    const res = await fetch(`${config.aiProxyUrl}/api/ai/analyze-requirement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        model: settings.geminiModel,
        knowledgeContext: knowledge.contextText || undefined,
      }),
    });
    if (res.ok) {
      const parsed = (await res.json()) as FeatureRequest;
      if (knowledge.hits.length > 0 && !parsed.productContext?.length) {
        parsed.productContext = knowledge.hits.map(
          (h) => `From knowledge “${h.document.title}” (${h.categoryTitle})`
        );
      }
      return parsed;
    }
  } catch {
    // fall through to deterministic generator
  }

  const newReqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const knowledgeContextLines =
    knowledge.hits.length > 0
      ? knowledge.hits.map((h) => `From knowledge “${h.document.title}” (${h.categoryTitle})`)
      : [
          'REST backend services are in production.',
          'Stripe and authentication SDKs are pre-configured.',
        ];
  return {
    id: newReqId,
    workspaceId: 'ws-CompanyBrain',
    projectId: 'prj-1',
    title: promptText.length > 40 ? `${promptText.slice(0, 40)}...` : promptText,
    subtitle: promptText,
    status: 'AI Analyzed',
    confidence: knowledge.hits.length > 0 ? 94 : 92,
    objective: `Integrate ${promptText} into the existing CompanyBrain application architecture.`,
    businessGoal: 'Improve conversion and reduce manual support work.',
    productContext: knowledgeContextLines,
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
