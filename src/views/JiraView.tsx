import React from 'react';
import type { JiraIssue } from '../types';

interface JiraViewProps {
  issues: JiraIssue[];
  loading?: boolean;
}

export const JiraView: React.FC<JiraViewProps> = ({ issues, loading }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">Jira Sync</h1>
        <p className="text-[15px] text-[#45464d] mt-1">
          Mock Jira issues persisted in workspace data (real Jira OAuth deferred for free MVP).
        </p>
      </div>

      {loading ? (
        <div className="text-[#76777d] text-sm">Loading issues…</div>
      ) : issues.length === 0 ? (
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center text-[#76777d]">
          No Jira issues yet. Approve a request and create Jira tasks to populate this board.
        </div>
      ) : (
        <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#f7f9fb] border-b border-[#c6c6cd] text-[12px] font-semibold text-[#76777d] uppercase">
            <div className="col-span-2">Key</div>
            <div className="col-span-5">Summary</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-1">Req</div>
          </div>
          <div className="divide-y divide-[#c6c6cd]/50">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-[14px] hover:bg-[#f7f9fb]"
              >
                <div className="col-span-2 font-mono text-[#4648d4] font-semibold">{issue.key}</div>
                <div className="col-span-5 text-[#191c1e]">{issue.summary}</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded bg-[#eceef0] text-[12px] font-medium">
                    {issue.status}
                  </span>
                </div>
                <div className="col-span-2 text-[#45464d]">{issue.assignee}</div>
                <div className="col-span-1 text-[12px] text-[#76777d]">{issue.linkedReq ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
