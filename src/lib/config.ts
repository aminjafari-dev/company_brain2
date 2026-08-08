export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appUrl: (import.meta.env.VITE_APP_URL as string | undefined) || 'http://localhost:3000',
  aiProxyUrl: (import.meta.env.VITE_AI_PROXY_URL as string | undefined) || 'http://localhost:8787',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);
