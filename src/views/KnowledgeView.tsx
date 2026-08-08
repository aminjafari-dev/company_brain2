import React, { useEffect, useState } from 'react';
import { ConnectedSource, KnowledgeCategory, TabType } from '../types';

interface KnowledgeViewProps {
  categories: KnowledgeCategory[];
  sources: ConnectedSource[];
  onNavigateTab: (tab: TabType) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  categories,
  sources: initialSources,
  onNavigateTab,
}) => {
  const [sources, setSources] = useState<ConnectedSource[]>(initialSources);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('3 minutes ago');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('Just now');
      setSources((prev) =>
        prev.map((s) => ({
          ...s,
          lastSync: s.id === 'confluence' ? 'Sync: Just now' : 'Sync: Just now',
          status: 'Connected',
          progress: 100,
        }))
      );
    }, 1200);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] mb-1">Company Knowledge</h1>
        <p className="text-[15px] text-[#45464d] flex items-center gap-1.5">
          <span>Everything your AI understands about your organization.</span>
          <span className="material-symbols-outlined text-[16px] text-[#6063ee] filled">auto_awesome</span>
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Documents
          </span>
          <span className="text-[20px] font-semibold text-[#191c1e]">18,421</span>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Jira Issues
          </span>
          <span className="text-[20px] font-semibold text-[#191c1e]">4,892</span>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Repositories
          </span>
          <span className="text-[20px] font-semibold text-[#191c1e]">126</span>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex flex-col shadow-2xs">
          <span className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-1">
            Lines of Code
          </span>
          <span className="text-[20px] font-semibold text-[#191c1e]">3.2M</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Categories */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center mb-4 border-b border-[#c6c6cd]/60 pb-2">
              <h2 className="text-[20px] font-semibold text-[#191c1e]">Knowledge Categories</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`bg-white border rounded-lg p-4 transition-all cursor-pointer group flex flex-col h-full shadow-2xs ${
                    selectedCategory === cat.id
                      ? 'border-[#6063ee] ring-2 ring-[#e1e0ff]'
                      : 'border-[#c6c6cd] hover:border-[#76777d]'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded bg-[#eceef0] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#76777d] group-hover:text-[#6063ee] transition-colors">
                        {cat.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#191c1e]">{cat.title}</h3>
                      <span className="text-[11px] text-[#76777d]">{cat.documentCount.toLocaleString()} indexed items</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-[#45464d] flex-1">{cat.description}</p>
                </div>
              ))}
            </div>

            {selectedCategory && (
              <div className="mt-4 p-4 bg-white border border-[#6063ee] rounded-lg text-[14px] text-[#191c1e]">
                <div className="font-semibold text-[#4648d4] mb-2 uppercase text-[12px]">
                  Category View: {selectedCategory.toUpperCase()}
                </div>
                <p className="text-[#45464d]">
                  Showing indexed vectors and document clusters for {selectedCategory}. AI uses these sources for context generation and request analysis.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Status & Connected Sources */}
        <div className="space-y-6">
          {/* AI Knowledge Status */}
          <section className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4 border-b border-[#c6c6cd]/60 pb-3">
              <h2 className="text-[20px] font-semibold text-[#191c1e] flex items-center gap-1.5">
                AI Knowledge Status
                <span className="material-symbols-outlined text-[16px] text-[#6063ee] filled">auto_awesome</span>
              </h2>
            </div>

            <div className="space-y-2 mb-4 text-[14px]">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#45464d]">Last synchronized</span>
                <span className="font-mono text-[#191c1e] font-medium">{lastSyncTime}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#45464d]">Knowledge Coverage</span>
                <span className="font-mono text-[#191c1e] font-medium">94%</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#45464d]">Active Sources</span>
                <span className="font-mono text-[#191c1e] font-medium">6 connected</span>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full bg-[#000000] text-white py-2 rounded text-[14px] font-medium hover:bg-[#2d3133] transition-colors flex justify-center items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Synchronizing Intelligence...' : 'Sync Now'}</span>
            </button>
          </section>

          {/* Connected Sources */}
          <section>
            <div className="flex items-center mb-4 border-b border-[#c6c6cd]/60 pb-2">
              <h2 className="text-[20px] font-semibold text-[#191c1e]">Connected Sources</h2>
            </div>

            <div className="space-y-3">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="bg-white border border-[#c6c6cd] rounded-lg p-3 flex flex-col hover:bg-[#f7f9fb] transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-[#eceef0] flex items-center justify-center text-[#76777d]">
                        <span className="material-symbols-outlined text-[18px]">{src.icon}</span>
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#191c1e]">{src.name}</div>
                        <div className="text-[12px] text-[#76777d]">{src.lastSync}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#eceef0] px-2.5 py-1 rounded-full">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          src.status === 'Connected' ? 'bg-[#10b981]' : 'bg-[#6063ee] animate-pulse'
                        }`}
                      />
                      <span className="text-[12px] text-[#191c1e] font-medium">{src.status}</span>
                    </div>
                  </div>

                  {src.status === 'Indexing' && (
                    <div className="w-full h-1 bg-[#eceef0] rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-[#6063ee] transition-all duration-300"
                        style={{ width: `${src.progress || 82}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
