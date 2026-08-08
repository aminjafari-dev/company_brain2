import React from 'react';
import { useAuthStore } from '../stores/authStore';
import type { TabType, UserProfile } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewRequest: () => void;
  user: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRequest,
  user,
}) => {
  const { logout, switchRole } = useAuthStore();

  const mainNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: 'auto_awesome' },
    { id: 'requests', label: 'Requests', icon: 'inbox' },
    { id: 'projects', label: 'Projects', icon: 'folder_open' },
    { id: 'jira', label: 'Jira', icon: 'integration_instructions' },
    { id: 'codebase', label: 'Codebase', icon: 'code' },
    { id: 'knowledge', label: 'Knowledge', icon: 'book' },
    { id: 'development', label: 'Development', icon: 'developer_mode' },
    { id: 'activity', label: 'Activity', icon: 'history' },
  ];

  const bottomNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'integrations', label: 'Integrations', icon: 'extension' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#f7f9fb] text-[#191c1e] border-r border-[#c6c6cd]/60 flex flex-col py-4 px-2 z-50 select-none">
      <div
        className="flex items-center gap-2 px-2 mb-6 cursor-pointer"
        onClick={() => setActiveTab('overview')}
      >
        <div className="w-8 h-8 rounded bg-[#131b2e] flex items-center justify-center text-white font-bold text-sm shrink-0">
          JV
        </div>
        <div className="overflow-hidden">
          <h1 className="font-semibold text-[15px] text-[#191c1e] leading-tight truncate">
            CompanyBrain Workspace
          </h1>
          <p className="text-[12px] text-[#45464d] font-medium truncate">
            Engineering Intelligence
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          setActiveTab('new-request');
          onOpenNewRequest();
        }}
        className="mb-4 mx-1 bg-[#000000] text-white py-2 px-3 rounded text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#2d3133] transition-colors cursor-pointer active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>New Request</span>
      </button>

      <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
        {mainNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-[7px] rounded text-[14px] text-left transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#6063ee] text-white font-semibold shadow-xs'
                  : 'text-[#45464d] hover:text-[#191c1e] hover:bg-[#f2f4f6]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 border-t border-[#c6c6cd]/50 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-[7px] rounded text-[14px] text-left transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#6063ee] text-white font-semibold'
                  : 'text-[#45464d] hover:text-[#191c1e] hover:bg-[#f2f4f6]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <div className="px-2 pt-2">
          <label className="text-[10px] uppercase tracking-wider text-[#76777d] font-medium">
            Role
          </label>
          <select
            className="mt-1 w-full text-[12px] border border-[#c6c6cd] rounded px-2 py-1.5 bg-white"
            value={user?.role ?? 'pm'}
            onChange={(e) => switchRole(e.target.value as UserProfile['role'])}
            aria-label="Switch role"
          >
            <option value="admin">Admin</option>
            <option value="pm">Product Manager</option>
            <option value="developer">Developer</option>
            <option value="client">Client</option>
          </select>
        </div>

        <div
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-3 px-3 py-[7px] rounded text-[14px] text-[#45464d] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-colors cursor-pointer"
        >
          <img
            src={
              user?.avatarUrl ||
              'https://i.pravatar.cc/100?u=CompanyBrain'
            }
            alt="User Avatar"
            className="w-5 h-5 rounded-full object-cover border border-[#c6c6cd]"
          />
          <span className="font-medium text-[14px] truncate">
            {user?.displayName ?? 'User'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full text-left px-3 py-1.5 text-[12px] text-[#76777d] hover:text-[#191c1e]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};
