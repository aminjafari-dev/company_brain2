import type { KnowledgeCategory, KnowledgeDocument } from '../types';

/** Tuned for local Gemini proxy token budgets while keeping enough grounding. */
const MAX_DOCUMENTS = 5;
const MAX_CHARS_PER_DOCUMENT = 2_800;
const MAX_TOTAL_CHARS = 12_000;
const MIN_SCORE_TO_INCLUDE = 1.5;

export interface KnowledgeHit {
  document: KnowledgeDocument;
  categoryTitle: string;
  score: number;
  excerpt: string;
}

export interface KnowledgeContextBundle {
  /** Formatted block injected into the AI system prompt / request. */
  contextText: string;
  /** Documents selected for this query (for UI / debugging). */
  hits: KnowledgeHit[];
  /** Total knowledge documents available in the workspace. */
  totalAvailable: number;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'can',
  'may',
  'might',
  'must',
  'shall',
  'with',
  'from',
  'by',
  'as',
  'into',
  'about',
  'than',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'we',
  'our',
  'you',
  'your',
  'they',
  'their',
  'i',
  'me',
  'my',
  'please',
  'need',
  'want',
  'make',
  'create',
  'add',
  'build',
  'implement',
  'new',
  'task',
  'ticket',
  'jira',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\-_.\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function uniqueTokens(text: string): string[] {
  return [...new Set(tokenize(text))];
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  const lower = haystack.toLowerCase();
  while ((idx = lower.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function scoreDocument(
  queryTokens: string[],
  doc: KnowledgeDocument,
  categoryTitle: string
): number {
  if (queryTokens.length === 0) return 0;

  const title = (doc.title || '').toLowerCase();
  const notes = (doc.notes || '').toLowerCase();
  const content = (doc.content || '').toLowerCase();
  const category = categoryTitle.toLowerCase();
  const fileName = (doc.fileName || '').toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 4;
    if (fileName.includes(token)) score += 2.5;
    if (category.includes(token)) score += 1.5;
    if (notes.includes(token)) score += 2 + Math.min(countOccurrences(notes, token), 3) * 0.25;
    if (content.includes(token)) {
      score += 1.2 + Math.min(countOccurrences(content, token), 8) * 0.15;
    }
  }

  // Prefer docs that actually have readable body text.
  if ((doc.content && doc.content.trim().length > 40) || (doc.notes && doc.notes.trim().length > 20)) {
    score += 0.5;
  }

  return score;
}

function buildExcerpt(doc: KnowledgeDocument, queryTokens: string[]): string {
  const parts: string[] = [];
  if (doc.notes?.trim()) {
    parts.push(doc.notes.trim());
  }
  if (doc.content?.trim()) {
    parts.push(doc.content.trim());
  }
  if (parts.length === 0) {
    return doc.fileName
      ? `[File attached: ${doc.fileName} — no extractable text content]`
      : '[No text content available for this document]';
  }

  const full = parts.join('\n\n');
  if (full.length <= MAX_CHARS_PER_DOCUMENT) return full;

  // Prefer a window around the first strong query match.
  const lower = full.toLowerCase();
  let bestIndex = 0;
  for (const token of queryTokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      bestIndex = Math.max(0, idx - 400);
      break;
    }
  }

  const slice = full.slice(bestIndex, bestIndex + MAX_CHARS_PER_DOCUMENT);
  const prefix = bestIndex > 0 ? '…' : '';
  const suffix = bestIndex + MAX_CHARS_PER_DOCUMENT < full.length ? '…' : '';
  return `${prefix}${slice}${suffix}`;
}

function formatHit(hit: KnowledgeHit, index: number): string {
  const updated = hit.document.updatedAt
    ? new Date(hit.document.updatedAt).toISOString().slice(0, 10)
    : 'unknown';
  const sourceBits = [
    hit.document.fileName ? `file: ${hit.document.fileName}` : null,
    `updated: ${updated}`,
  ].filter(Boolean);

  return [
    `### ${index}. [${hit.categoryTitle}] ${hit.document.title}`,
    `Source: manual knowledge (${sourceBits.join(' · ')})`,
    '',
    hit.excerpt,
  ].join('\n');
}

/**
 * Rank workspace knowledge against a user prompt and format a grounded
 * context block for the AI agent.
 */
export function buildKnowledgeContext(params: {
  prompt: string;
  documents: KnowledgeDocument[];
  categories: KnowledgeCategory[];
  /** When true and nothing scores well, include a short catalog of recent docs. */
  includeCatalogFallback?: boolean;
}): KnowledgeContextBundle {
  const { prompt, documents, categories, includeCatalogFallback = true } = params;
  const categoryById = new Map(categories.map((c) => [c.id, c.title]));
  const queryTokens = uniqueTokens(prompt);

  const scored: KnowledgeHit[] = documents
    .map((document) => {
      const categoryTitle = categoryById.get(document.categoryId) ?? 'General';
      const score = scoreDocument(queryTokens, document, categoryTitle);
      return {
        document,
        categoryTitle,
        score,
        excerpt: buildExcerpt(document, queryTokens),
      };
    })
    .filter((h) => h.score >= MIN_SCORE_TO_INCLUDE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DOCUMENTS);

  let hits = scored;

  // If the query is too vague to rank, still expose a compact catalog so the
  // model knows what company knowledge exists.
  if (hits.length === 0 && includeCatalogFallback && documents.length > 0) {
    const recent = [...documents]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, Math.min(3, documents.length));

    hits = recent.map((document) => {
      const categoryTitle = categoryById.get(document.categoryId) ?? 'General';
      return {
        document,
        categoryTitle,
        score: 0,
        excerpt: buildExcerpt(document, queryTokens).slice(0, 900),
      };
    });
  }

  if (hits.length === 0) {
    return {
      contextText: '',
      hits: [],
      totalAvailable: documents.length,
    };
  }

  const sections: string[] = [];
  let used = 0;

  for (let i = 0; i < hits.length; i++) {
    const block = formatHit(hits[i], i + 1);
    if (used + block.length > MAX_TOTAL_CHARS && sections.length > 0) break;
    const clipped =
      block.length > MAX_TOTAL_CHARS - used
        ? `${block.slice(0, Math.max(0, MAX_TOTAL_CHARS - used - 1))}…`
        : block;
    sections.push(clipped);
    used += clipped.length;
  }

  const rankedNote =
    scored.length > 0
      ? `Retrieved ${sections.length} relevant document(s) for this request (of ${documents.length} available).`
      : `No strong keyword match; providing ${sections.length} recent document(s) as background (of ${documents.length} available).`;

  const contextText = [
    '## Company Knowledge',
    rankedNote,
    'Use these sources when answering, clarifying, or drafting tasks. Prefer facts from this knowledge over generic assumptions. When you rely on a source, mention its title briefly. If knowledge conflicts with the latest user request, ask a clarifying question.',
    '',
    sections.join('\n\n---\n\n'),
  ].join('\n');

  return {
    contextText,
    hits,
    totalAvailable: documents.length,
  };
}
