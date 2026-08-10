// Supabase Edge Function: ai-chat
// Deploy with: supabase functions deploy ai-chat
// Secret: supabase secrets set GEMINI_API_KEY=...

import { GoogleGenAI } from 'npm:@google/genai@1.0.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { prompt, history = [], model, knowledgeContext, forceTaskReady } = await req.json();
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const knowledgeBlock =
      typeof knowledgeContext === 'string' && knowledgeContext.trim()
        ? `\n\n---\nGround your answers in the following company knowledge when relevant.\n${knowledgeContext.trim()}\n---`
        : '';

    const forceBlock = forceTaskReady
      ? `\n\nIMPORTANT: Clarification answers provided. Return mode "task_ready" with draftTask. No more questions.`
      : '';

    const ai = new GoogleGenAI({ apiKey: key });
    const system = `You are CompanyBrain's client intake agent.
Choose mode "chat" (info only), "clarify" (1-5 questions each with exactly 3 options a/b/c), or "task_ready" (full draftTask).
Prefer company knowledge; cite document titles when used.
Return ONLY JSON:
{"mode":"chat"|"clarify"|"task_ready","state":"ready"|"asking_question"|"ready_to_finalize","text":"...","clarification":{"intro":"...","questions":[{"id":"q1","prompt":"...","options":[{"id":"a","label":"..."},{"id":"b","label":"..."},{"id":"c","label":"..."}]}]},"draftTask":{"title":"...","summary":"...","acceptanceCriteria":["..."],"effort":"Low"|"Medium"|"High"}}
Omit clarification unless clarify. Omit draftTask unless task_ready.${knowledgeBlock}${forceBlock}`;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.0-flash',
      contents: [
        ...history.map((h: { role: string; text: string }) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
        { role: 'user', parts: [{ text: prompt }] },
      ],
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { mode: 'chat', state: 'ready', text: raw };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), state: 'error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
