# CompanyBrain Workspace — Engineering Intelligence (Dynamic Free MVP)

React + Vite app that turns a static AI Studio demo into a **dynamic** product:

- **Auth + roles** (Client / PM / Developer / Admin)
- **Persisted workspace data** (requests, chat, Jira mocks, activity, settings)
- **Live overview metrics** computed from stored requests
- **Gemini AI** via a local proxy (API key never in the browser)
- Optional **real Jira Cloud** creates from the AI Assistant
- Optional **Supabase Free** (Auth + Postgres) when you add credentials

---

## What this product does

CompanyBrain is an **engineering intake + planning workspace**. A client (or anyone) describes a feature; AI clarifies missing details, drafts a Jira-ready task, and the team reviews impact against knowledge, codebase, and projects.

**Main happy path:**

1. Sign in as a role (Client, PM, Developer, or Admin).
2. Open **AI Assistant** and describe what you want built.
3. Answer clarification questions (or get a draft if details are already clear).
4. Click **Create on Jira** → a real Task is created in Atlassian (when Jira env is set), and a request appears in **Requests**.
5. A PM reviews the request (approve / reject / ask for more info) and can push related Jira tasks.
6. Developers track work under **Development**; everyone sees history under **Activity**.

Without Gemini or Jira configured, the app still runs with **offline AI fallback** and **local mock data**.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Required (`engines` in `package.json`) |
| **npm** | Comes with Node |
| Browser | Chrome / Edge / Safari / Firefox |
| (Optional) Google AI key | Live Gemini chat — [Google AI Studio](https://aistudio.google.com/apikey) |
| (Optional) Atlassian API token | Real Jira creates — [API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| (Optional) Supabase project | Cloud auth + Postgres instead of localStorage |

---

## Step-by-step: run the product (local free mode)

This is the default path. No paid services required.

### 1. Install dependencies

```bash
cd company_brain2
npm install
```

### 2. Create your env file

```bash
cp .env.example .env.local
```

Open `.env.local`. For the **minimum run** you can leave most values empty:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:3000
VITE_AI_PROXY_URL=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
PORT=8787

JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=KAN
JIRA_ISSUE_TYPE=Task
```

### 3. Start the frontend

```bash
npm run dev
```

Open **http://localhost:3000**

You should see the login screen. The app is running in **local mode**: data is stored in the browser (`localStorage`).

### 4. Sign in (demo users)

Password for **all** demo users: `demo1234`

| Role | Email |
|------|--------|
| Admin | admin@companybrain.demo |
| PM | pm@companybrain.demo |
| Developer | dev@companybrain.demo |
| Client | client@companybrain.demo |

Or use the **quick role buttons** on the login screen.

After login you land on **Overview**. Use the sidebar to move between screens. You can also change role anytime from the **Role** dropdown at the bottom of the sidebar.

### 5. (Optional) Live Gemini AI

Without a key, chat still works with an **offline fallback**. For real Gemini answers:

1. Put your key in `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

2. In a **second** terminal:

```bash
npm run ai-server
```

This starts the proxy on **http://localhost:8787**. Vite forwards `/api/ai` to that process.

3. Keep both terminals running:

| Terminal | Command | Port |
|----------|---------|------|
| 1 | `npm run dev` | 3000 (UI + Jira middleware) |
| 2 | `npm run ai-server` | 8787 (Gemini) |

4. In the UI, open **AI Assistant** and send a message. Live replies show as Gemini-backed; if the proxy is down, you get the offline fallback badge.

### 6. (Optional) Real Jira creates

**Create on Jira** does **not** need `ai-server`. It runs through the Vite dev middleware when `npm run dev` is up.

1. In `.env.local` set:

```
JIRA_BASE_URL=https://your-site.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_atlassian_api_token
JIRA_PROJECT_KEY=KAN
JIRA_ISSUE_TYPE=Task
```

2. **Restart** `npm run dev` after changing Jira env vars (middleware loads env at startup).

3. In **AI Assistant**, finish a draft task and click **Create on Jira**. A real Task should appear in your Atlassian project; the app also creates a matching request and Jira issue row locally.

If Jira env is missing, Create on Jira fails with a clear error — it does **not** invent fake issue keys.

---

## Product walkthrough (what each screen does)

Use this as the “how the product works” guide after you are logged in.

### Overview (`/overview`)

Dashboard of the workspace: request metrics, AI insights, and shortcuts into requests or other tabs. Metrics are computed from **persisted** requests (not hard-coded forever).

### AI Assistant (`/ai`) — primary intake flow

1. Click **New chat** (or continue an existing conversation in the left list).
2. Type a feature request, e.g. “Add Apple Pay to checkout on iOS.”
3. The agent responds in one of three modes:
   - **chat** — informational answer
   - **clarify** — multiple-choice questions (pick options or write a custom answer)
   - **task_ready** — draft task with title, summary, acceptance criteria, effort
4. When you see a draft, use **Create on Jira** to finalize.
5. Knowledge documents (see Knowledge) are sent as grounding context when the AI proxy is online.

Chat history persists across refresh (localStorage or Supabase).

### New Request (`/requests/new`)

Alternate intake: paste a prompt and run **AI analysis** to create a structured feature request (status, matched files, plan, etc.), then open it under Requests.

### Requests / PM Review (`/requests`, `/requests/:id`)

List and detail of feature requests. Typical PM actions:

- **Approve** / **Reject** / **Request more info**
- **Create Jira tasks** from the development plan (mock or integrated depending on setup)

Statuses move through a lifecycle such as Draft → AI Analysis → Ready for PM Review → Approved → Development Planning → In Development → QA → Completed.

### Projects (`/projects`)

Workspace projects (repos, stack, progress). Context for where requests belong.

### Jira (`/jira`)

Board/list of Jira issues known to the workspace (seeded mocks plus any real issues created from the AI Assistant).

### Codebase (`/codebase`)

Browse indexed/mock source files; open snippets in the code viewer modal. Used to show “what this request would touch.”

### Knowledge (`/knowledge`)

Company docs and categories. Add/delete documents so AI intake can ground answers and clarifications. Seed docs live under `test-docs/` as examples of content style.

### Development (`/development`)

Dev task board / list. Update task status as work progresses.

### Activity (`/activity`)

Audit-style feed: who did what (chat finalized, request approved, etc.).

### Integrations (`/integrations`)

Toggle connected sources (GitHub, Jira, etc.) — status is persisted for the demo.

### Settings (`/settings`)

Workspace preferences (e.g. preferred Gemini model name for the proxy). Use **Reset demo data** to wipe local workspace state and reseed.

**Keyboard:** `Cmd/Ctrl + K` opens global search.

---

## Suggested first demo (end-to-end)

1. `npm install` → `cp .env.example .env.local` → `npm run dev`
2. Log in as **Client** (`client@companybrain.demo` / `demo1234`)
3. Go to **AI Assistant** → describe a feature
4. Answer clarifications until you get a draft task
5. (Optional) With Jira env + restart: **Create on Jira**
6. Switch role to **PM** in the sidebar → open **Requests** → approve the request
7. Open **Activity** and **Jira** to confirm side effects
8. Switch to **Developer** → check **Development**

---

## Optional: Supabase Free

Already wired when both are set in `.env` / `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

To recreate on a fresh project:

1. Create a free Supabase project
2. Run SQL in `supabase/migrations/001_schema.sql` then `002_seed.sql`
3. Set the two `VITE_*` vars above
4. Create Auth users matching demo emails and link `profiles` rows
5. (Optional) Deploy `supabase/functions/ai-chat` and set `GEMINI_API_KEY` as a secret

The app prefers Supabase when configured and falls back to local persistence if queries fail. Login screen shows “Using Supabase Auth” when configured.

---

## How the pieces fit together

```
Browser (localhost:3000)
  ├── React UI (views + Zustand stores)
  ├── localStorage  OR  Supabase (Auth + Postgres)
  └── /api/...
        ├── /api/jira/issues  → Vite middleware (jiraDevPlugin) → Atlassian
        └── /api/ai/*         → proxied to ai-server (:8787) → Gemini
```

| Folder | Role |
|--------|------|
| `src/views/` | Screens |
| `src/stores/` | Auth, workspace, UI state (Zustand) |
| `src/services/` | Domain logic (chat, requests, Jira finalize) |
| `src/data/` | Seed data + localStorage store |
| `server/` | Express Gemini proxy + Jira helpers + Vite Jira plugin |
| `supabase/` | Schema + Edge Function for cloud mode |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite frontend (:3000) + Jira create middleware |
| `npm run ai-server` | Gemini proxy (:8787) — needed for live AI |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run clean` | Remove `dist/` |

---

## Security

- Never put `GEMINI_API_KEY`, `JIRA_API_TOKEN`, or Supabase `service_role` in `VITE_*` vars (those are exposed to the browser).
- Rotate any key that was previously committed to `.env.example` or git history.
- Local demo passwords are for development only.

---

## Troubleshooting

| Symptom | What to do |
|---------|------------|
| Blank / “Restoring session…” forever | Hard refresh; if stuck, clear site data for localhost:3000 |
| AI always offline | Set `GEMINI_API_KEY`, run `npm run ai-server`, keep it running |
| Create on Jira fails | Set all `JIRA_*` vars, **restart** `npm run dev` |
| Port 3000 in use | Stop the other process or change Vite port in `package.json` |
| Want a clean slate | Settings → **Reset demo data** |
| Node version errors | Upgrade to Node 20+ (`node -v`) |
