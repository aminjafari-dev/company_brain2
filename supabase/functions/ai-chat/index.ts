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
        systemInstruction:
          'You are JoshV Engineering Intelligence AI. AI recommends; humans decide.',
      },
    });

    return new Response(
      JSON.stringify({ text: response.text || '', state: 'ready' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), state: 'error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
