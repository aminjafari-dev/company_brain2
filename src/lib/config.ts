export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appUrl: (import.meta.env.VITE_APP_URL as string | undefined) || 'http://localhost:3000',
  /**
   * Backend for AI + Jira. Prefer same-origin `/api` (Vite middleware / proxy)
   * so Create on Jira works with only `npm run dev`. Override with
   * VITE_AI_PROXY_URL when pointing at a remote proxy.
   */
  aiProxyUrl: (import.meta.env.VITE_AI_PROXY_URL as string | undefined) || '',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);
