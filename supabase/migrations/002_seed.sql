-- Seed CompanyBrain workspace (run after 001_schema.sql)
-- Note: profiles require auth.users rows — create users in Supabase Auth UI first,
-- then update profile ids to match. Until then, use local persistence mode.

insert into workspaces (id, name, slug)
values ('ws-CompanyBrain', 'CompanyBrain', 'CompanyBrain')
on conflict (id) do nothing;

insert into workspace_settings (workspace_id, ai_autonomy, gemini_model, sync_interval_minutes)
values ('ws-CompanyBrain', 'Require Approval', 'gemini-2.0-flash', 15)
on conflict (workspace_id) do nothing;

insert into projects (id, workspace_id, name, repo, status, progress, lead, requests_count, stack)
values
  ('prj-1', 'ws-CompanyBrain', 'Mobile Checkout Refactor', 'CompanyBrain/checkout-flutter', 'Active Sprint', 78, 'Amin Jafari', 4, '["Flutter","Dart","Stripe SDK"]'::jsonb),
  ('prj-2', 'ws-CompanyBrain', 'Payment Gateway Node Microservice', 'CompanyBrain/payment-service-node', 'In Review', 92, 'Josh V', 2, '["Node.js","Express","TypeScript"]'::jsonb),
  ('prj-3', 'ws-CompanyBrain', 'Intelligence Indexing Engine', 'CompanyBrain/knowledge-vector-db', 'Active', 64, 'AI Agent', 6, '["Python","Postgres","Gemini"]'::jsonb)
on conflict (id) do nothing;

insert into requests (id, workspace_id, project_id, title, subtitle, status, confidence, business_requirements, pm_decision)
values
  ('REQ-1024', 'ws-CompanyBrain', 'prj-1', 'Add Apple Pay to Checkout', 'Apple Pay Support implementation proposal', 'Ready for PM Review', 94, 'Enable Apple Pay in checkout for iOS users.', 'Pending'),
  ('REQ-1025', 'ws-CompanyBrain', 'prj-2', 'Customer delivery notifications', 'SMS and email on delivery dispatch', 'New Request', 88, 'Notify customers when order is out for delivery.', null),
  ('REQ-1100', 'ws-CompanyBrain', 'prj-1', 'Subscription pause from profile', 'Pause recurring billing 1–3 months', 'In Development', 91, 'Users can pause subscriptions from profile.', null),
  ('REQ-990', 'ws-CompanyBrain', 'prj-3', 'Knowledge sync reliability', 'Retry failed Confluence indexing', 'Completed', 97, 'Auto-retry failed knowledge syncs.', null)
on conflict (id) do nothing;

insert into integrations (id, workspace_id, name, description, status, last_sync, icon)
values
  ('int-jira', 'ws-CompanyBrain', 'Jira', 'Issues and sprints', 'Connected', '3 mins ago', 'integration_instructions'),
  ('int-github', 'ws-CompanyBrain', 'GitHub', 'Repositories', 'Connected', '12 mins ago', 'code'),
  ('int-notion', 'ws-CompanyBrain', 'Notion', 'Product docs', 'Connected', '1 hour ago', 'description'),
  ('int-slack', 'ws-CompanyBrain', 'Slack', 'Notifications', 'Disconnected', 'Never', 'chat')
on conflict (id) do nothing;

insert into jira_issues_mock (id, workspace_id, key, summary, status, assignee, type, linked_req)
values
  ('ji-1', 'ws-CompanyBrain', 'JIRA-284', 'Stripe Payment Integration & Webhook Handler', 'In Progress', 'Amin Jafari', 'Task', 'REQ-1024'),
  ('ji-2', 'ws-CompanyBrain', 'JIRA-285', 'Backend Stripe PaymentIntent setup for Apple Pay', 'To Do', 'Backend Team', 'Sub-task', 'REQ-1024')
on conflict (id) do nothing;
