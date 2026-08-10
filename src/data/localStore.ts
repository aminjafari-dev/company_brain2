import type { AppDatabase } from '../types';
import { createSeedDatabase } from './seed';

const STORAGE_KEY = 'CompanyBrain-workspace-db-v1';
const SESSION_KEY = 'CompanyBrain-workspace-session-v1';
const CURRENT_VERSION = 3;

const SHUTDOWN_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);

function migrateDatabase(db: AppDatabase): AppDatabase {
  let next = { ...db };

  if (!Array.isArray(next.knowledgeDocuments)) {
    next = { ...next, knowledgeDocuments: [] };
  }

  if (Array.isArray(next.knowledgeCategories)) {
    const counts = new Map<string, number>();
    for (const doc of next.knowledgeDocuments) {
      counts.set(doc.categoryId, (counts.get(doc.categoryId) ?? 0) + 1);
    }
    next = {
      ...next,
      knowledgeCategories: next.knowledgeCategories.map((cat) => ({
        ...cat,
        documentCount: counts.get(cat.id) ?? 0,
      })),
    };
  }

  // Older Flash IDs are shut down or return free-tier limit: 0 for new keys.
  if (next.settings && SHUTDOWN_MODELS.has(next.settings.geminiModel)) {
    next = {
      ...next,
      settings: { ...next.settings, geminiModel: 'gemini-flash-latest' },
    };
  }

  next = { ...next, version: CURRENT_VERSION };
  return next;
}

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
    if (
      parsed.version < CURRENT_VERSION ||
      !Array.isArray(parsed.knowledgeDocuments) ||
      (parsed.settings && SHUTDOWN_MODELS.has(parsed.settings.geminiModel))
    ) {
      const migrated = migrateDatabase(parsed);
      saveDatabase(migrated);
      return migrated;
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
