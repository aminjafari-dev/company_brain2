import { DEMO_PASSWORD } from '../data/seed';
import { getSessionUserId, setSessionUserId } from '../data/localStore';
import { isSupabaseConfigured } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';
import { getRepository } from './dataProvider';

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      const email = data.session?.user?.email;
      if (email) {
        const profile = await getRepository().getUserByEmail(email);
        if (profile) return profile;
      }
    }
  }
  const id = getSessionUserId();
  if (!id) return null;
  return getRepository().getUserById(id);
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<UserProfile> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await getRepository().getUserByEmail(data.user.email ?? email);
      if (!profile) throw new Error('Profile not found for authenticated user');
      setSessionUserId(profile.id);
      return profile;
    }
  }

  const user = await getRepository().getUserByEmail(email);
  if (!user || password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password. Use demo password: demo1234');
  }
  setSessionUserId(user.id);
  return user;
}

export async function loginAsRole(role: UserRole): Promise<UserProfile> {
  const users = await getRepository().listUsers();
  const user = users.find((u) => u.role === role);
  if (!user) throw new Error(`No demo user for role ${role}`);
  setSessionUserId(user.id);
  return user;
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    await sb?.auth.signOut();
  }
  setSessionUserId(null);
}

export async function switchRole(role: UserRole): Promise<UserProfile> {
  return loginAsRole(role);
}
