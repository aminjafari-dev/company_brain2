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
    const { prompt, history = [], model } = await req.json();
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const system = `You are CompanyBrain's client intake agent.
Ask exactly ONE clarifying question at a time until you can finalize ONE Jira task.
Return ONLY JSON: {"state":"asking_question"|"ready_to_finalize"|"ready","text":"...","draftTask":{"title":"...","summary":"...","acceptanceCriteria":["..."],"effort":"Low"|"Medium"|"High"}}
Omit draftTask unless state is ready_to_finalize.`;

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
      parsed = { state: 'ready', text: raw };
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
