import React, { useState } from 'react';

interface TopNavbarProps {
  onSearchClick: () => void;
  onDeploy: () => void;
  onShare: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onSearchClick, onDeploy, onShare }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-[#f7f9fb]/80 backdrop-blur-md border-b border-[#c6c6cd]/60 flex items-center justify-between px-6 z-40 ml-[240px]">
      {/* Search Input */}
      <div className="flex items-center gap-4">
        <div
          onClick={onSearchClick}
          className="relative w-64 bg-white border border-[#c6c6cd] rounded px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:border-[#76777d] transition-all shadow-2xs"
        >
          <span className="material-symbols-outlined text-[#76777d] text-[18px]">search</span>
          <span className="text-[14px] text-[#76777d] flex-1 truncate">Search codebase, requests...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-[#f2f4f6] border border-[#c6c6cd] rounded px-1.5 text-[10px] text-[#45464d] font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-4 text-[15px] text-[#45464d]">
          <a href="#docs" onClick={(e) => e.preventDefault()} className="hover:text-[#4648d4] transition-colors">
            Docs
          </a>
          <a href="#support" onClick={(e) => e.preventDefault()} className="hover:text-[#4648d4] transition-colors">
            Support
          </a>
          <a href="#feedback" onClick={(e) => e.preventDefault()} className="hover:text-[#4648d4] transition-colors">
            Feedback
          </a>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications & Help */}
        <div className="relative flex items-center gap-1 text-[#45464d] border-r border-[#c6c6cd]/60 pr-4">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUnreadCount(0);
            }}
            className="p-1.5 hover:text-[#000000] hover:bg-[#f2f4f6] rounded transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#6063ee] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => alert("JoshV Workspace Assistance: Click 'AI Assistant' on the left to ask questions about your codebase, architecture, and Jira issues.")}
            className="p-1.5 hover:text-[#000000] hover:bg-[#f2f4f6] rounded transition-colors cursor-pointer"
            title="Help"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 top-10 w-80 bg-white border border-[#c6c6cd] rounded-lg shadow-lg py-2 z-50 text-[14px]">
              <div className="px-4 py-2 border-b border-[#c6c6cd]/50 font-semibold text-[#191c1e] flex justify-between items-center">
                <span>Notifications</span>
                <span className="text-[12px] text-[#6063ee]">Mark all read</span>
              </div>
              <div className="divide-y divide-[#c6c6cd]/30 max-h-60 overflow-y-auto">
                <div className="px-4 py-2.5 hover:bg-[#f2f4f6] cursor-pointer">
                  <div className="text-[13px] font-medium text-[#191c1e]">REQ-1024 Analyzed by AI</div>
                  <div className="text-[12px] text-[#45464d]">High confidence match with payment_service.dart</div>
                  <div className="text-[11px] text-[#76777d] mt-1">2 mins ago</div>
                </div>
                <div className="px-4 py-2.5 hover:bg-[#f2f4f6] cursor-pointer">
                  <div className="text-[13px] font-medium text-[#191c1e]">Confluence Sync Completed</div>
                  <div className="text-[12px] text-[#45464d]">1,240 documents updated in knowledge index</div>
                  <div className="text-[11px] text-[#76777d] mt-1">15 mins ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Share & Deploy Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onShare}
            className="text-[#191c1e] text-[14px] font-medium px-3 py-1.5 rounded border border-[#c6c6cd] hover:bg-[#f2f4f6] transition-colors cursor-pointer active:scale-[0.98]"
          >
            Share
          </button>
          <button
            onClick={onDeploy}
            className="bg-[#000000] text-white text-[14px] font-medium px-4 py-1.5 rounded hover:bg-[#2d3133] transition-colors cursor-pointer active:scale-[0.98]"
          >
            Deploy
          </button>
        </div>

        {/* User Avatar */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0epFgq0-fheOL-FKl3I5ENZnRF8rd6XTmgtRT9hZ-NROJo9Oe_gEiHFjthT_fH1DSsFZwEZ153hHgSIVRh465faOSVZWHpXegdVjsGsM37v9XWCZucPRoxKiJIvKti8dpvqaxwIecC7Ksejwl2XfA3Eg5fL_KTghN6EZ5Tw4CozfRxItJXoyk3vdGQF69unig9KaqW6CrirqjS9cf4KbbYcv4io6fOL3qOzr8ABdnC4OGxKO4OJAM2Q"
          alt="User Avatar"
          className="w-8 h-8 rounded-full border border-[#c6c6cd] object-cover cursor-pointer hover:ring-2 hover:ring-[#6063ee]/30 transition-all"
        />
      </div>
    </header>
  );
};
