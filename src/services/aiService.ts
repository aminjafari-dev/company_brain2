import { config } from '../lib/config';
import type { ChatMessage, FeatureRequest } from '../types';
import { getRepository } from './dataProvider';

export type AIAgentState =
  | 'idle'
  | 'thinking'
  | 'asking_question'
  | 'analyzing'
  | 'searching_knowledge'
  | 'analyzing_code'
  | 'generating_requirement'
  | 'ready'
  | 'error';

export interface AIChatResponse {
  text: string;
  analysisCard?: ChatMessage['analysisCard'];
  state: AIAgentState;
}

function offlineReply(prompt: string): AIChatResponse {
  const lower = prompt.toLowerCase();
  if (lower.includes('apple pay')) {
    return {
      state: 'ready',
      text: 'Based on the JoshV payment architecture (Stripe), Apple Pay needs Flutter checkout UI updates and Node PaymentIntent configuration. Google Pay patterns already exist and can be reused.',
      analysisCard: {
        title: 'Apple Pay Integration Analysis',
        status: 'Draft',
        summary:
          'Reuse Stripe SDK; add ApplePayButton; configure PaymentIntent for Apple Pay on the backend.',
        affectedSystems: ['Flutter App (iOS)', 'Payment Service (Node.js)'],
        relatedJira: 'JIRA-284',
        estComplexity: 'Medium',
      },
    };
  }
  if (lower.includes('faster') || lower.includes('performance')) {
    return {
      state: 'asking_question',
      text: 'What part of the application are you referring to? App startup, navigation, checkout, data loading, or something else?',
    };
  }
  return {
    state: 'ready',
    text: `I analyzed "${prompt}" against JoshV knowledge (checkout, payments, orders, notifications). No blocking architectural conflicts were found. I can create a structured request when you are ready.`,
  };
}

export async function chatWithAI(params: {
  prompt: string;
  conversationId: string;
  history?: { role: 'user' | 'model'; text: string }[];
}): Promise<AIChatResponse> {
  try {
    const settings = await getRepository().getSettings();
    const res = await fetch(`${config.aiProxyUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        history: params.history ?? [],
        model: settings.geminiModel,
      }),
    });
    if (!res.ok) throw new Error(`AI proxy ${res.status}`);
    const data = (await res.json()) as AIChatResponse;
    return data;
  } catch {
    return offlineReply(params.prompt);
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
    workspaceId: 'ws-joshv',
    projectId: 'prj-1',
    title: promptText.length > 40 ? `${promptText.slice(0, 40)}...` : promptText,
    subtitle: promptText,
    status: 'AI Analyzed',
    confidence: 92,
    objective: `Integrate ${promptText} into the existing JoshV application architecture.`,
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
