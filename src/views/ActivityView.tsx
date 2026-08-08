import React from 'react';
import type { ActivityEvent } from '../types';

interface ActivityViewProps {
  events: ActivityEvent[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ events }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">
          System Activity Audit Log
        </h1>
        <p className="text-[15px] text-[#45464d] mt-1">
          Immutable audit stream of AI decisions, PM approvals, and sync events.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center text-[#76777d]">
          No activity yet.
        </div>
      ) : (
        <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
          <div className="divide-y divide-[#c6c6cd]/50 text-[14px]">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 flex items-center justify-between hover:bg-[#f7f9fb] transition-colors gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-[#6063ee] text-[20px] shrink-0">
                    history
                  </span>
                  <span className="text-[#191c1e] font-medium truncate">
                    {event.actor} {event.action} {event.target}
                    {event.detail ? ` — ${event.detail}` : ''}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-[#76777d] shrink-0">
                  {relativeTime(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
