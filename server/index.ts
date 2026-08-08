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
const modelDefault = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

app.use(express.json({ limit: '1mb' }));

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
    const { prompt, history = [], model } = req.body as {
      prompt: string;
      history?: { role: 'user' | 'model'; text: string }[];
      model?: string;
    };
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const ai = getClient();
    const system = `You are CompanyBrain's client intake agent.
Your job: talk with the client, ask clarifying questions, then finalize ONE development task for Jira.

Rules:
- Ask exactly ONE clear question at a time when information is missing.
- Cover: who the user is, goal, platform (iOS/Android/web), expected behavior, and constraints/edge cases.
- Be concise and professional. Do not invent unrelated features.
- When you have enough detail to write a concrete task, set state to "ready_to_finalize" and fill draftTask.
- Otherwise set state to "asking_question".
- Use state "ready" only for general Q&A that is not a new work request.

Return ONLY valid JSON (no markdown) with this shape:
{
  "state": "asking_question" | "ready_to_finalize" | "ready",
  "text": "message shown to the client",
  "draftTask": {
    "title": "short Jira summary",
    "summary": "1-3 sentence description",
    "acceptanceCriteria": ["criterion 1", "criterion 2"],
    "effort": "Low" | "Medium" | "High"
  }
}
Omit draftTask unless state is "ready_to_finalize".`;

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
      state?: string;
      text?: string;
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
      parsed = { state: 'ready', text: raw };
    }

    const state =
      parsed.state === 'asking_question' ||
      parsed.state === 'ready_to_finalize' ||
      parsed.state === 'ready'
        ? parsed.state
        : 'ready';

    const draft =
      state === 'ready_to_finalize' && parsed.draftTask?.title
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
      text: parsed.text || 'I could not generate a response.',
      state,
      draftTask: draft,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI error';
    res.status(503).json({ error: message, state: 'error' });
  }
});

app.post('/api/ai/analyze-requirement', async (req, res) => {
  try {
    const { prompt, model } = req.body as { prompt: string; model?: string };
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const ai = getClient();
    const response = await ai.models.generateContent({
      model: model || modelDefault,
      contents: `Turn this client request into structured JSON for a product requirement.
Return ONLY JSON with keys:
id (REQ-####), title, subtitle, status ("AI Analyzed"), confidence (number),
objective, businessGoal, businessRequirements, acceptanceCriteria (array of {id,text,completed}),
technicalImpactSummary, aiRecommendation ({title,description}),
devPlan (array of {seq,component,task,effort,jiraCreated}),
completeness ({businessRequirement,userActor,goal,expectedBehavior,platform,acceptanceCriteria,edgeCases,score}).

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
