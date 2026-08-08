import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';
import { DEMO_PASSWORD } from '../data/seed';
import { isSupabaseConfigured } from '../lib/config';

const roles: { role: UserRole; label: string; email: string }[] = [
  { role: 'admin', label: 'Admin', email: 'admin@CompanyBrain.demo' },
  { role: 'pm', label: 'Product Manager', email: 'pm@CompanyBrain.demo' },
  { role: 'developer', label: 'Developer', email: 'dev@CompanyBrain.demo' },
  { role: 'client', label: 'Client', email: 'client@CompanyBrain.demo' },
];

export const LoginPage: React.FC = () => {
  const { login, loginAsRole, error, loading } = useAuthStore();
  const [email, setEmail] = useState('pm@CompanyBrain.demo');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded bg-[#131b2e] flex items-center justify-center text-white font-bold">
            JV
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#191c1e]">CompanyBrain Workspace</h1>
            <p className="text-sm text-[#45464d]">Engineering Intelligence</p>
          </div>
        </div>

        <div className="bg-white border border-[#c6c6cd]/60 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#191c1e] mb-1">Sign in</h2>
          <p className="text-sm text-[#76777d] mb-5">
            {isSupabaseConfigured
              ? 'Using Supabase Auth'
              : 'Free local mode — data persists in this browser'}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-[#45464d]">Email</span>
              <input
                className="mt-1 w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4648d4]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#45464d]">Password</span>
              <input
                type="password"
                className="mt-1 w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4648d4]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#2d3133] disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-6">
              <p className="text-xs text-[#76777d] mb-2">
                Quick demo roles (password: {DEMO_PASSWORD})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => loginAsRole(r.role)}
                    className="text-left border border-[#c6c6cd]/80 rounded-lg px-3 py-2 hover:bg-[#f7f9fb] text-sm"
                  >
                    <div className="font-medium text-[#191c1e]">{r.label}</div>
                    <div className="text-[11px] text-[#76777d] truncate">{r.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
