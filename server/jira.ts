/**
 * Real Jira Cloud REST helpers for the local proxy server.
 * Credentials stay server-side (never VITE_*).
 */

export type CreateJiraIssueInput = {
  title: string;
  summary: string;
  acceptanceCriteria?: string[];
  effort?: string;
  issueType?: string;
};

export type CreatedJiraIssue = {
  id: string;
  key: string;
  self: string;
  browseUrl: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function isJiraConfigured(): boolean {
  return Boolean(
    process.env.JIRA_BASE_URL?.trim() &&
      process.env.JIRA_EMAIL?.trim() &&
      process.env.JIRA_API_TOKEN?.trim() &&
      process.env.JIRA_PROJECT_KEY?.trim()
  );
}

function authHeader(): string {
  const email = requiredEnv('JIRA_EMAIL');
  const token = requiredEnv('JIRA_API_TOKEN');
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

function baseUrl(): string {
  return requiredEnv('JIRA_BASE_URL').replace(/\/$/, '');
}

function projectKey(): string {
  return requiredEnv('JIRA_PROJECT_KEY');
}

function toAdfDescription(
  summary: string,
  acceptanceCriteria: string[],
  effort?: string
) {
  const content: object[] = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: summary }],
    },
  ];

  if (effort) {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Effort: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: effort },
      ],
    });
  }

  if (acceptanceCriteria.length > 0) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Acceptance criteria' }],
    });
    content.push({
      type: 'bulletList',
      content: acceptanceCriteria.map((item) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: item }],
          },
        ],
      })),
    });
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

export async function createJiraIssue(
  input: CreateJiraIssueInput
): Promise<CreatedJiraIssue> {
  if (!isJiraConfigured()) {
    throw new Error(
      'Real Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY.'
    );
  }

  const issueType = input.issueType || process.env.JIRA_ISSUE_TYPE || 'Task';
  const body = {
    fields: {
      project: { key: projectKey() },
      summary: input.title.slice(0, 255),
      issuetype: { name: issueType },
      description: toAdfDescription(
        input.summary,
        input.acceptanceCriteria ?? [],
        input.effort
      ),
    },
  };

  const res = await fetch(`${baseUrl()}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as {
        errorMessages?: string[];
        errors?: Record<string, string>;
      };
      detail =
        parsed.errorMessages?.join('; ') ||
        Object.entries(parsed.errors ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ') ||
        raw;
    } catch {
      // keep raw
    }
    throw new Error(`Jira API ${res.status}: ${detail}`);
  }

  const created = JSON.parse(raw) as { id: string; key: string; self: string };
  return {
    id: created.id,
    key: created.key,
    self: created.self,
    browseUrl: `${baseUrl()}/browse/${created.key}`,
  };
}
