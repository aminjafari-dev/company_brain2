/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';

import { OverviewView } from './views/OverviewView';
import { AIAssistantView } from './views/AIAssistantView';
import { NewRequestView } from './views/NewRequestView';
import { PMReviewView } from './views/PMReviewView';
import { KnowledgeView } from './views/KnowledgeView';
import { ProjectsView } from './views/ProjectsView';
import { JiraView } from './views/JiraView';
import { CodebaseView } from './views/CodebaseView';
import { DevelopmentView } from './views/DevelopmentView';
import { ActivityView } from './views/ActivityView';
import { IntegrationsView } from './views/IntegrationsView';
import { SettingsView } from './views/SettingsView';

import { CodeViewerModal } from './components/modals/CodeViewerModal';
import { DependencyGraphModal } from './components/modals/DependencyGraphModal';
import { SearchModal } from './components/modals/SearchModal';

import type { TabType } from './types';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useUiStore } from './stores/uiStore';

const TAB_PATH: Record<TabType, string> = {
  overview: '/overview',
  'ai-assistant': '/ai',
  requests: '/requests',
  'new-request': '/requests/new',
  projects: '/projects',
  jira: '/jira',
  codebase: '/codebase',
  knowledge: '/knowledge',
  development: '/development',
  activity: '/activity',
  integrations: '/integrations',
  settings: '/settings',
};

function pathToTab(pathname: string): TabType {
  if (pathname.startsWith('/requests/new')) return 'new-request';
  if (pathname.startsWith('/requests')) return 'requests';
  if (pathname.startsWith('/ai')) return 'ai-assistant';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/jira')) return 'jira';
  if (pathname.startsWith('/codebase')) return 'codebase';
  if (pathname.startsWith('/knowledge')) return 'knowledge';
  if (pathname.startsWith('/development')) return 'development';
  if (pathname.startsWith('/activity')) return 'activity';
  if (pathname.startsWith('/integrations')) return 'integrations';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'overview';
}

function RequestRouteSync() {
  const { requestId } = useParams();
  const selectRequest = useWorkspaceStore((s) => s.selectRequest);
  useEffect(() => {
    if (requestId) selectRequest(requestId);
  }, [requestId, selectRequest]);
  return null;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const store = useWorkspaceStore();
  const ui = useUiStore();

  const activeTab = pathToTab(location.pathname);

  useEffect(() => {
    if (user) void store.bootstrap(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ui.setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui]);

  const setActiveTab = (tab: TabType) => {
    navigate(TAB_PATH[tab]);
  };

  const selected =
    store.requests.find((r) => r.id === store.selectedRequestId) ||
    store.requests[0] ||
    null;

  if (store.loading && store.requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] text-[#76777d]">
        Loading workspace…
      </div>
    );
  }

  if (store.error && store.requests.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fb] gap-3">
        <p className="text-red-600">{store.error}</p>
        <button
          className="text-sm text-[#4648d4] underline"
          onClick={() => user && store.bootstrap(user.id)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col font-sans selection:bg-[#e1e0ff] selection:text-[#2f2ebe]">
      {store.toast && (
        <div className="fixed bottom-6 right-6 bg-[#000000] text-white text-[13px] font-medium px-4 py-2.5 rounded-lg shadow-xl z-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#10b981]">
            check_circle
          </span>
          <span>{store.toast}</span>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRequest={() => navigate('/requests/new')}
        user={user}
      />

      <TopNavbar
        onSearchClick={() => ui.setSearchOpen(true)}
        onDeploy={() => store.showToast('Deploy is mocked in free MVP')}
        onShare={() => store.showToast('Share link mocked in free MVP')}
      />

      <main className="ml-[240px] pt-16 flex-1 flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1">
          <Routes>
            <Route
              path="/overview"
              element={
                <OverviewView
                  requests={store.requests}
                  insights={store.insights}
                  metrics={store.metrics}
                  userName={user?.displayName?.split(' ')[0]}
                  onSelectRequest={(id) => {
                    store.selectRequest(id);
                    navigate(`/requests/${id}`);
                  }}
                  onOpenDependencyGraph={() => ui.setDependencyGraphOpen(true)}
                  onNavigateTab={setActiveTab}
                />
              }
            />
            <Route
              path="/ai"
              element={
                <AIAssistantView
                  messages={store.messages}
                  onSendMessage={async (text) => {
                    if (!user) return;
                    await store.sendChat(user.id, text, user.displayName);
                  }}
                  onFinalizeToJira={async (draftTask) => {
                    if (!user) return;
                    await store.finalizeChatTask(user.id, user.displayName, draftTask);
                  }}
                  onNavigateTab={setActiveTab}
                  onOpenDependencyGraph={() => ui.setDependencyGraphOpen(true)}
                />
              }
            />
            <Route
              path="/requests/new"
              element={
                <NewRequestView
                  currentRequest={selected}
                  onAnalyzeNewRequest={async (prompt) => {
                    if (!user) return;
                    const req = await store.analyzeRequest(prompt, user.displayName);
                    navigate(`/requests/${req.id}`);
                  }}
                  onViewFile={(file) => ui.setViewingFile(file)}
                  onNavigateTab={setActiveTab}
                />
              }
            />
            <Route
              path="/requests/:requestId?"
              element={
                <>
                  <RequestRouteSync />
                  <PMReviewView
                  request={selected}
                  requests={store.requests}
                  onSelectRequest={(id) => {
                    store.selectRequest(id);
                    navigate(`/requests/${id}`);
                  }}
                  onApprovePlan={(id) => {
                    if (!user) return;
                    void store.approveRequest(id, user.displayName);
                  }}
                  onReject={(id) => {
                    if (!user) return;
                    void store.rejectRequest(id, user.displayName);
                  }}
                  onRequestMoreInfo={(id) => {
                    if (!user) return;
                    void store.requestMoreInfo(id, user.displayName);
                  }}
                  onCreateJiraTasks={(id) => {
                    if (!user) return;
                    void store.createJiraTasks(id, user.displayName);
                  }}
                />
                </>
              }
            />
            <Route
              path="/projects"
              element={
                <ProjectsView
                  projects={store.projects}
                  onNavigateTab={setActiveTab}
                />
              }
            />
            <Route
              path="/jira"
              element={<JiraView issues={store.jiraIssues} loading={store.loading} />}
            />
            <Route
              path="/codebase"
              element={
                <CodebaseView
                  files={store.codeFiles}
                  onViewFile={(file) => ui.setViewingFile(file)}
                />
              }
            />
            <Route
              path="/knowledge"
              element={
                <KnowledgeView
                  categories={store.knowledge}
                  sources={store.sources}
                  onNavigateTab={setActiveTab}
                />
              }
            />
            <Route
              path="/development"
              element={
                <DevelopmentView
                  tasks={store.developmentTasks}
                  onStatusChange={(id, status) =>
                    void store.updateDevTaskStatus(id, status)
                  }
                />
              }
            />
            <Route path="/activity" element={<ActivityView events={store.activity} />} />
            <Route
              path="/integrations"
              element={
                <IntegrationsView
                  integrations={store.integrations}
                  onToggle={(id) => void store.toggleIntegration(id)}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsView
                  settings={store.settings}
                  user={user}
                  onSave={(s) => void store.saveSettings(s)}
                  onResetDemo={() => {
                    if (!user) return;
                    void store.resetDemo(user.id);
                  }}
                />
              }
            />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </div>
        <Footer />
      </main>

      <CodeViewerModal
        file={ui.viewingFile}
        onClose={() => ui.setViewingFile(null)}
      />
      <DependencyGraphModal
        isOpen={ui.isDependencyGraphOpen}
        onClose={() => ui.setDependencyGraphOpen(false)}
      />
      <SearchModal
        isOpen={ui.isSearchOpen}
        onClose={() => ui.setSearchOpen(false)}
        onSelectTab={(tab, reqId) => {
          if (reqId) {
            store.selectRequest(reqId);
            navigate(`/requests/${reqId}`);
          } else {
            setActiveTab(tab);
          }
        }}
      />
    </div>
  );
}

function AuthGate() {
  const { user, loading, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] text-[#76777d]">
        Restoring session…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}
