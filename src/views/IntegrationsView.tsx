import React from 'react';
import type { Integration } from '../types';

interface IntegrationsViewProps {
  integrations: Integration[];
  onToggle: (id: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  integrations,
  onToggle,
}) => {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">
          Connected Workspace Integrations
        </h1>
        <p className="text-[15px] text-[#45464d] mt-1">
          Connect / disconnect persists in workspace data. Live OAuth is deferred for the free MVP.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map((item) => {
          const connected =
            item.status === 'Connected' || item.status === 'Indexing';
          return (
            <div
              key={item.id}
              className="bg-white border border-[#c6c6cd] rounded-lg p-5 shadow-2xs hover:border-[#76777d] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="w-10 h-10 rounded bg-[#eceef0] flex items-center justify-center text-[#191c1e]">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      connected
                        ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                        : 'bg-[#f2f4f6] text-[#76777d] border-[#c6c6cd]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connected ? 'bg-[#10b981]' : 'bg-[#c6c6cd]'
                      }`}
                    />
                    {item.status}
                  </span>
                </div>
                <h3 className="text-[16px] font-semibold text-[#191c1e]">{item.name}</h3>
                <p className="text-[13px] text-[#45464d] leading-normal mt-1">
                  {item.description}
                </p>
                <p className="text-[12px] text-[#76777d] mt-2">Last sync: {item.lastSync}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#c6c6cd]/60 flex justify-end">
                <button
                  onClick={() => onToggle(item.id)}
                  className="text-[13px] text-[#4648d4] font-medium hover:underline cursor-pointer"
                >
                  {connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
