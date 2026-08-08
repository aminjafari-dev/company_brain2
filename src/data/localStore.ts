import type { AppDatabase } from '../types';
import { createSeedDatabase } from './seed';

const STORAGE_KEY = 'joshv-workspace-db-v1';
const SESSION_KEY = 'joshv-workspace-session-v1';

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedDatabase();
      saveDatabase(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as AppDatabase;
    if (!parsed.version) {
      const seed = createSeedDatabase();
      saveDatabase(seed);
      return seed;
    }
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    saveDatabase(seed);
    return seed;
  }
}

export function saveDatabase(db: AppDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDatabase(): AppDatabase {
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

export function updateDatabase(mutator: (db: AppDatabase) => void): AppDatabase {
  const db = loadDatabase();
  mutator(db);
  saveDatabase(db);
  return db;
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(userId: string | null): void {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
}
