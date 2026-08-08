import React from 'react';
import { FeatureRequest, AIInsight, TabType, OverviewMetrics } from '../types';

interface OverviewViewProps {
  requests: FeatureRequest[];
  insights: AIInsight[];
  metrics: OverviewMetrics | null;
  userName?: string;
  onSelectRequest: (reqId: string) => void;
  onOpenDependencyGraph: () => void;
  onNavigateTab: (tab: TabType) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  requests,
  insights,
  metrics,
  userName = 'there',
  onSelectRequest,
  onOpenDependencyGraph,
  onNavigateTab,
}) => {
  const m = metrics ?? {
    newRequests: 0,
    aiAnalyzed: 0,
    waitingForPm: 0,
    inDevelopment: 0,
    completed: 0,
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">Good morning, {userName}</h2>
        <p className="text-[15px] text-[#45464d] mt-1">Here's what is happening across your projects.</p>
      </div>

      {/* KPI Row — live counts from workspace data */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 pb-2">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-[#76777d] uppercase tracking-wider">New Requests</span>
          <span className="text-[36px] font-semibold text-[#191c1e] mt-1 leading-none">{m.newRequests}</span>
        </div>

        <div className="flex flex-col border-l border-[#c6c6cd]/70 pl-4">
          <span className="text-[12px] font-medium text-[#76777d] uppercase tracking-wider flex items-center">
            <span className="material-symbols-outlined text-[14px] text-[#6063ee] filled mr-1">auto_awesome</span>
            AI Analyzed
          </span>
          <span className="text-[36px] font-semibold text-[#4648d4] mt-1 leading-none">{m.aiAnalyzed}</span>
        </div>

        <div className="flex flex-col border-l border-[#c6c6cd]/70 pl-4">
          <span className="text-[12px] font-medium text-[#76777d] uppercase tracking-wider">Waiting for PM</span>
          <span className="text-[36px] font-semibold text-[#191c1e] mt-1 leading-none">{m.waitingForPm}</span>
        </div>

        <div className="flex flex-col border-l border-[#c6c6cd]/70 pl-4">
          <span className="text-[12px] font-medium text-[#76777d] uppercase tracking-wider">In Development</span>
          <span className="text-[36px] font-semibold text-[#191c1e] mt-1 leading-none">{m.inDevelopment}</span>
        </div>

        <div className="flex flex-col border-l border-[#c6c6cd]/70 pl-4">
          <span className="text-[12px] font-medium text-[#76777d] uppercase tracking-wider">Completed</span>
          <span className="text-[36px] font-semibold text-[#76777d] mt-1 leading-none">{m.completed}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Needs Your Attention Column */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[20px] font-semibold text-[#191c1e]">Needs Your Attention</h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-[14px] text-[#4648d4] hover:underline font-medium cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
            {requests.map((req) => (
              <div
                key={req.id}
                onClick={() => onSelectRequest(req.id)}
                className="p-4 border-b border-[#c6c6cd]/60 hover:bg-[#f2f4f6] transition-colors border-l-2 border-l-[#6063ee] flex items-start justify-between cursor-pointer group"
              >
                <div className="flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-[12px] text-[#45464d] bg-[#f2f4f6] px-2 py-0.5 rounded border border-[#c6c6cd]/40">
                      {req.id}
                    </span>

                    {req.confidence && (
                      <span className="text-[12px] font-medium text-[#4648d4] bg-[#e1e0ff] px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] filled">auto_awesome</span>
                        Confidence {req.confidence}%
                      </span>
                    )}

                    <span
                      className={`text-[12px] font-medium px-2 py-0.5 rounded border ${
                        req.status === 'Ready for PM Review'
                          ? 'text-[#059669] bg-[#ecfdf5] border-[#a7f3d0]'
                          : 'text-[#45464d] bg-[#f2f4f6] border-[#c6c6cd]/50'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <h4 className="text-[15px] font-semibold text-[#191c1e] group-hover:text-[#4648d4] transition-colors">
                    {req.title}
                  </h4>
                  {req.subtitle && <p className="text-[13px] text-[#45464d] mt-0.5 line-clamp-1">{req.subtitle}</p>}
                </div>

                <button className="text-[#76777d] group-hover:text-[#191c1e] mt-1 transition-colors">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights Column */}
        <div className="lg:col-span-1">
          <div className="mb-3">
            <h3 className="text-[20px] font-semibold text-[#191c1e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#6063ee] filled">auto_awesome</span>
              AI Insights
            </h3>
          </div>

          <div className="space-y-4">
            {/* Potential Duplicate Card */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[12px] font-semibold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded border border-[#fde68a]">
                  Potential Duplicate
                </span>
                <span className="material-symbols-outlined text-[#76777d] text-[18px]">info</span>
              </div>
              <p className="text-[14px] text-[#191c1e] mb-3">
                Request <span className="font-mono font-medium">REQ-1025</span> closely matches an existing Jira issue.
              </p>
              <div
                onClick={() => onNavigateTab('jira')}
                className="bg-[#f7f9fb] rounded p-2.5 border border-[#c6c6cd]/60 flex items-center gap-2 cursor-pointer hover:bg-[#f2f4f6] transition-colors"
              >
                <span className="material-symbols-outlined text-[#2684ff] text-[18px]">integration_instructions</span>
                <div>
                  <div className="font-mono text-[12px] text-[#191c1e] font-semibold">JIRA-284</div>
                  <div className="text-[12px] text-[#45464d]">Stripe Payment Integration</div>
                </div>
              </div>
            </div>

            {/* Technical Impact Card */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[12px] font-semibold text-[#4648d4] bg-[#e1e0ff] px-2 py-0.5 rounded border border-[#c0c1ff]">
                  Technical Impact
                </span>
                <span className="material-symbols-outlined text-[#76777d] text-[18px]">account_tree</span>
              </div>
              <p className="text-[14px] text-[#191c1e] mb-3">
                The proposed changes in 'Apple Pay' will affect 4 core modules.
              </p>
              <button
                onClick={onOpenDependencyGraph}
                className="text-[14px] text-[#4648d4] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View dependency graph</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
