import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';
import { createJiraIssue, isJiraConfigured } from './jira';

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Serves POST /api/jira/issues from the Vite dev server so Create on Jira
 * works without a separate ai-server process.
 */
export function jiraDevApiPlugin(): Plugin {
  return {
    name: 'companybrain-jira-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/jira/issues' || req.method !== 'POST') {
          next();
          return;
        }

        try {
          if (!isJiraConfigured()) {
            sendJson(res, 503, {
              error:
                'Real Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY in .env.local, then restart npm run dev.',
            });
            return;
          }

          const body = (await readJsonBody(req)) as {
            title?: string;
            summary?: string;
            acceptanceCriteria?: string[];
            effort?: string;
            issueType?: string;
          };

          if (!body.title?.trim()) {
            sendJson(res, 400, { error: 'title required' });
            return;
          }

          const issue = await createJiraIssue({
            title: body.title.trim(),
            summary: (body.summary || body.title).trim(),
            acceptanceCriteria: Array.isArray(body.acceptanceCriteria)
              ? body.acceptanceCriteria
              : [],
            effort: body.effort,
            issueType: body.issueType,
          });
          sendJson(res, 201, issue);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Jira error';
          sendJson(res, 502, { error: message });
        }
      });
    },
  };
}
