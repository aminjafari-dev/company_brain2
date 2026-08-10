/**
 * Local Gemini AI + Jira proxy — keeps API keys off the browser.
 * Free MVP: run with `npm run ai-server` alongside Vite.
 */
import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createJiraIssue, isJiraConfigured } from './jira';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const app = express();
const port = Number(process.env.PORT || 8787);
const modelDefault = process.env.GEMINI_MODEL || 'gemini-flash-latest';

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    jiraConfigured: isJiraConfigured(),
    jiraProjectKey: process.env.JIRA_PROJECT_KEY || null,
    model: modelDefault,
  });
});

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey: key });
}

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, history = [], model, knowledgeContext, forceTaskReady } = req.body as {
      prompt: string;
      history?: { role: 'user' | 'model'; text: string }[];
      model?: string;
      knowledgeContext?: string;
      forceTaskReady?: boolean;
    };
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const ai = getClient();
    const knowledgeBlock =
      typeof knowledgeContext === 'string' && knowledgeContext.trim()
        ? `\n\n---\nGround your answers in the following company knowledge when relevant.\n${knowledgeContext.trim()}\n---`
        : '';

    const forceBlock = forceTaskReady
      ? `\n\nIMPORTANT: The user already answered clarification questions. You MUST return mode "task_ready" with a complete draftTask. Do not ask more questions.`
      : '';

    const system = `You are CompanyBrain's client intake agent.
Choose exactly ONE response mode for the latest user message:

1) mode "chat"
   - Informational / exploratory questions (what/why/how, explanations).
   - No intent to create a development task.
   - Return helpful text only. Omit clarification and draftTask.

2) mode "clarify"
   - User wants to create/build/add/implement something, but key details are missing
     (actor, platform, expected behavior, constraints, success/failure).
   - Emit 1 to 5 clarifying questions (prefer 2–4).
   - Each question MUST include exactly 3 concrete options (id a/b/c + label).
   - Ground option labels in company knowledge when available.
   - Do NOT include draftTask.
   - text should be a short intro; full questions go in clarification.questions.

3) mode "task_ready"
   - Enough detail to draft ONE concrete Jira task, OR clarification answers were provided.
   - Fill draftTask (title, summary, acceptanceCriteria, effort).
   - Omit clarification.

Rules:
- The LATEST user message is the active request. draftTask MUST reflect that message.
- Never reuse an old feature unless the latest message clearly asks for it.
- Prefer company knowledge over generic assumptions; briefly cite document titles when used.
- If knowledge already answers a detail, do not re-ask it in clarify mode.
- Be concise and professional.

Return ONLY valid JSON (no markdown):
{
  "mode": "chat" | "clarify" | "task_ready",
  "state": "ready" | "asking_question" | "ready_to_finalize",
  "text": "message shown to the client",
  "clarification": {
    "intro": "short preamble",
    "questions": [
      {
        "id": "q1",
        "prompt": "question text",
        "options": [
          { "id": "a", "label": "option A" },
          { "id": "b", "label": "option B" },
          { "id": "c", "label": "option C" }
        ]
      }
    ]
  },
  "draftTask": {
    "title": "short Jira summary",
    "summary": "1-3 sentence description",
    "acceptanceCriteria": ["criterion 1", "criterion 2"],
    "effort": "Low" | "Medium" | "High"
  }
}
Map state to mode: chat→ready, clarify→asking_question, task_ready→ready_to_finalize.
Omit clarification unless mode is clarify. Omit draftTask unless mode is task_ready.${knowledgeBlock}${forceBlock}`;

    const contents = [
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: 'user' as const, parts: [{ text: prompt }] },
    ];

    const response = await ai.models.generateContent({
      model: model || modelDefault,
      contents,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let parsed: {
      mode?: string;
      state?: string;
      text?: string;
      clarification?: {
        intro?: string;
        questions?: {
          id?: string;
          prompt?: string;
          options?: { id?: string; label?: string }[];
        }[];
      };
      draftTask?: {
        title?: string;
        summary?: string;
        acceptanceCriteria?: string[];
        effort?: string;
      };
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { mode: 'chat', state: 'ready', text: raw };
    }

    let mode: 'chat' | 'clarify' | 'task_ready' =
      parsed.mode === 'clarify' || parsed.mode === 'task_ready' || parsed.mode === 'chat'
        ? parsed.mode
        : parsed.state === 'ready_to_finalize'
          ? 'task_ready'
          : parsed.state === 'asking_question'
            ? 'clarify'
            : 'chat';

    if (forceTaskReady) mode = 'task_ready';

    const state =
      mode === 'task_ready'
        ? 'ready_to_finalize'
        : mode === 'clarify'
          ? 'asking_question'
          : 'ready';

    const questions = Array.isArray(parsed.clarification?.questions)
      ? parsed.clarification!.questions!
          .filter((q) => q && typeof q.prompt === 'string' && q.prompt.trim())
          .slice(0, 5)
          .map((q, qi) => {
            const opts = (Array.isArray(q.options) ? q.options : [])
              .filter((o) => o && typeof o.label === 'string' && o.label.trim())
              .slice(0, 3)
              .map((o, oi) => ({
                id: (o.id && String(o.id).trim()) || ['a', 'b', 'c'][oi],
                label: String(o.label).trim(),
              }));
            while (opts.length < 3) {
              opts.push({
                id: ['a', 'b', 'c'][opts.length],
                label: ['Not sure yet', 'Need discussion', 'Other'][opts.length],
              });
            }
            return {
              id: (q.id && String(q.id).trim()) || `q${qi + 1}`,
              prompt: String(q.prompt).trim(),
              options: opts,
            };
          })
      : [];

    const clarification =
      mode === 'clarify' && questions.length > 0
        ? {
            intro:
              (parsed.clarification?.intro && String(parsed.clarification.intro).trim()) ||
              parsed.text ||
              'I need a few details before drafting the task.',
            questions,
          }
        : undefined;

    if (mode === 'clarify' && !clarification) {
      mode = 'chat';
    }

    const draft =
      mode === 'task_ready' && parsed.draftTask?.title
        ? {
            title: parsed.draftTask.title,
            summary: parsed.draftTask.summary || parsed.draftTask.title,
            acceptanceCriteria: Array.isArray(parsed.draftTask.acceptanceCriteria)
              ? parsed.draftTask.acceptanceCriteria
              : [],
            effort:
              parsed.draftTask.effort === 'Low' ||
              parsed.draftTask.effort === 'Medium' ||
              parsed.draftTask.effort === 'High'
                ? parsed.draftTask.effort
                : 'Medium',
          }
        : undefined;

    res.json({
      text: parsed.text || clarification?.intro || 'I could not generate a response.',
      mode: clarification ? 'clarify' : mode === 'task_ready' ? 'task_ready' : 'chat',
      state: clarification
        ? 'asking_question'
        : mode === 'task_ready'
          ? 'ready_to_finalize'
          : 'ready',
      clarification,
      draftTask: draft,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI error';
    res.status(503).json({ error: message, state: 'error' });
  }
});

app.post('/api/ai/analyze-requirement', async (req, res) => {
  try {
    const { prompt, model, knowledgeContext } = req.body as {
      prompt: string;
      model?: string;
      knowledgeContext?: string;
    };
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const knowledgeBlock =
      typeof knowledgeContext === 'string' && knowledgeContext.trim()
        ? `\n\nCompany knowledge to ground the analysis:\n${knowledgeContext.trim()}\n`
        : '';

    const ai = getClient();
    const response = await ai.models.generateContent({
      model: model || modelDefault,
      contents: `Turn this client request into structured JSON for a product requirement.
Ground objective, businessGoal, productContext, technicalImpactSummary, and acceptanceCriteria in company knowledge when available. Mention source document titles inside productContext entries when used.
Return ONLY JSON with keys:
id (REQ-####), title, subtitle, status ("AI Analyzed"), confidence (number),
objective, businessGoal, productContext (string array), businessRequirements, acceptanceCriteria (array of {id,text,completed}),
technicalImpactSummary, aiRecommendation ({title,description}),
devPlan (array of {seq,component,task,effort,jiraCreated}),
completeness ({businessRequirement,userActor,goal,expectedBehavior,platform,acceptanceCriteria,edgeCases,score}).
${knowledgeBlock}
Client request:
${prompt}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    const parsed = JSON.parse(raw);
    const now = new Date().toISOString();
    res.json({
      workspaceId: 'ws-CompanyBrain',
      projectId: 'prj-1',
      pmDecision: 'Pending',
      createdAt: now,
      updatedAt: now,
      matchedFiles: [
        {
          path: 'lib/services/payment_service.dart',
          matchPercentage: 88,
          description: 'Likely related module based on CompanyBrain codebase map.',
        },
      ],
      ...parsed,
      id: parsed.id || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'AI Analyzed',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI error';
    res.status(503).json({ error: message });
  }
});

app.post('/api/jira/issues', async (req, res) => {
  try {
    const { title, summary, acceptanceCriteria, effort, issueType } = req.body as {
      title?: string;
      summary?: string;
      acceptanceCriteria?: string[];
      effort?: string;
      issueType?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: 'title required' });
      return;
    }
    const issue = await createJiraIssue({
      title: title.trim(),
      summary: (summary || title).trim(),
      acceptanceCriteria: Array.isArray(acceptanceCriteria) ? acceptanceCriteria : [],
      effort,
      issueType,
    });
    res.status(201).json(issue);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Jira error';
    const status = message.includes('not configured') ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`CompanyBrain AI proxy listening on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY missing — /api/ai/* will return 503; frontend will use offline fallback.');
  }
  if (!isJiraConfigured()) {
    console.warn(
      'Warning: Jira not configured — set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY for real issue creation.'
    );
  } else {
    console.log(`Jira configured for project ${process.env.JIRA_PROJECT_KEY}`);
  }
});
