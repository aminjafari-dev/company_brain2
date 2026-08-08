/**
 * Local Gemini AI proxy — keeps GEMINI_API_KEY off the browser.
 * Free MVP: run with `npm run ai-server` alongside Vite.
 */
import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

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
    const system = `You are the CompanyBrain Engineering Intelligence AI assistant.
You understand clients, requirements, Jira context, Flutter/Node payment architecture (Stripe), and company knowledge.
AI recommends; humans decide. Be concise and professional.
If the user asks something vague like "make it faster", ask a clarifying multiple-choice style question.
When discussing Apple Pay / payments, mention affected systems and complexity.`;

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
      },
    });

    const text = response.text || 'I could not generate a response.';
    const lower = prompt.toLowerCase();
    const analysisCard =
      lower.includes('apple pay') || lower.includes('payment')
        ? {
            title: 'Technical impact draft',
            status: 'Draft',
            summary: text.slice(0, 220),
            affectedSystems: ['Flutter checkout', 'Payment Service (Node.js)', 'Stripe'],
            relatedJira: 'JIRA-284',
            estComplexity: 'Medium',
          }
        : undefined;

    res.json({
      text,
      analysisCard,
      state: lower.includes('faster') ? 'asking_question' : 'ready',
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

app.listen(port, () => {
  console.log(`CompanyBrain AI proxy listening on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY missing — /api/ai/* will return 503; frontend will use offline fallback.');
  }
});
