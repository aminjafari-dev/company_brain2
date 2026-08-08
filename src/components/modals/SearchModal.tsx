import React, { useEffect, useState } from 'react';
import { SearchService } from '../../services';
import type { SearchResult, TabType } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType, requestId?: string) => void;
}

const typeIcon: Record<SearchResult['type'], string> = {
  project: 'folder_open',
  request: 'inbox',
  jira: 'integration_instructions',
  code: 'code',
  documentation: 'book',
  client: 'group',
  person: 'person',
};

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const data = await SearchService.search(query || 'a');
      if (!cancelled) {
        setResults(query.trim() ? data : data.slice(0, 8));
        setLoading(false);
      }
    };
    const t = setTimeout(run, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center z-50 pt-20 p-4">
      <div
        role="dialog"
        aria-label="Global search"
        className="bg-white border border-[#c6c6cd] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-3 border-b border-[#c6c6cd] flex items-center gap-3 bg-white">
          <span className="material-symbols-outlined text-[#76777d] text-[20px]">search</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, requests, Jira, code, people..."
            className="w-full text-[15px] outline-none placeholder-[#76777d] text-[#191c1e]"
          />
          <button
            onClick={onClose}
            className="text-[#76777d] hover:text-[#191c1e] text-[12px] font-mono px-2 py-1 bg-[#f2f4f6] rounded"
          >
            ESC
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto divide-y divide-[#c6c6cd]/30">
          {loading ? (
            <div className="p-6 text-center text-[#76777d] text-[14px]">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-[#76777d] text-[14px]">
              No matching results found
            </div>
          ) : (
            results.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  onSelectTab(item.tab ?? 'overview', item.type === 'request' ? item.id : undefined);
                  onClose();
                }}
                className="p-2.5 rounded-lg hover:bg-[#f2f4f6] cursor-pointer flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#f2f4f6] flex items-center justify-center text-[#45464d] group-hover:text-[#4648d4] group-hover:bg-[#e1e0ff] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">
                      {typeIcon[item.type]}
                    </span>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-[#191c1e] group-hover:text-[#4648d4] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-[#76777d]">
                      {item.type} · {item.subtitle}
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#76777d] text-[16px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-[#f7f9fb] border-t border-[#c6c6cd] text-[12px] text-[#76777d] flex justify-between items-center">
          <span>JoshV Engineering Intelligence Search</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
};
