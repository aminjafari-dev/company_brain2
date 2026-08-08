import React, { useEffect, useState } from 'react';
import type { UserProfile, WorkspaceSettings } from '../types';
import { isSupabaseConfigured } from '../lib/config';

interface SettingsViewProps {
  settings: WorkspaceSettings | null;
  user: UserProfile | null;
  onSave: (settings: WorkspaceSettings) => void;
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  user,
  onSave,
  onResetDemo,
}) => {
  const [model, setModel] = useState(settings?.geminiModel ?? 'gemini-2.0-flash');
  const [autonomy, setAutonomy] = useState<WorkspaceSettings['aiAutonomy']>(
    settings?.aiAutonomy ?? 'Require Approval'
  );
  const [syncMinutes, setSyncMinutes] = useState(settings?.syncIntervalMinutes ?? 15);

  useEffect(() => {
    if (!settings) return;
    setModel(settings.geminiModel);
    setAutonomy(settings.aiAutonomy);
    setSyncMinutes(settings.syncIntervalMinutes);
  }, [settings]);

  if (!settings) {
    return (
      <div className="max-w-[1024px] mx-auto px-8 py-8 text-[#76777d]">Loading settings…</div>
    );
  }

  return (
    <div className="max-w-[1024px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">
          Workspace Settings
        </h1>
        <p className="text-[15px] text-[#45464d] mt-1">
          Configure AI autonomy, model, and demo data. Signed in as {user?.displayName} (
          {user?.role}).
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 shadow-2xs">
          <h3 className="text-[18px] font-semibold text-[#191c1e] mb-1">AI Intelligence Engine</h3>
          <p className="text-[14px] text-[#45464d] mb-4">
            Model used by the local AI proxy / Edge Function.
          </p>
          <div className="space-y-3">
            {['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'].map((m) => (
              <label
                key={m}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#f7f9fb] border-[#c6c6cd]"
              >
                <input
                  type="radio"
                  name="model"
                  value={m}
                  checked={model === m}
                  onChange={() => setModel(m)}
                  className="accent-[#6063ee]"
                />
                <div className="text-[14px] font-semibold text-[#191c1e]">{m}</div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 shadow-2xs">
          <h3 className="text-[18px] font-semibold text-[#191c1e] mb-1">AI Autonomy</h3>
          <p className="text-[14px] text-[#45464d] mb-4">
            AI recommends. Humans decide. Default: Require Approval.
          </p>
          <select
            className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm"
            value={autonomy}
            onChange={(e) =>
              setAutonomy(e.target.value as WorkspaceSettings['aiAutonomy'])
            }
          >
            <option>Suggest Only</option>
            <option>Require Approval</option>
            <option>Automatic</option>
          </select>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 shadow-2xs">
          <h3 className="text-[16px] font-semibold text-[#191c1e] mb-1">Sync interval</h3>
          <p className="text-[13px] text-[#45464d] mb-3">
            Mock integration sync interval (minutes).
          </p>
          <input
            type="number"
            min={5}
            max={120}
            value={syncMinutes}
            onChange={(e) => setSyncMinutes(Number(e.target.value))}
            className="w-32 border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 shadow-2xs">
          <h3 className="text-[16px] font-semibold text-[#191c1e] mb-1">Data mode</h3>
          <p className="text-[13px] text-[#45464d]">
            {isSupabaseConfigured
              ? 'Supabase is configured — Auth/Postgres preferred with local fallback.'
              : 'Local persistence mode (localStorage). Add VITE_SUPABASE_URL + anon key to use Supabase Free.'}
          </p>
          {!isSupabaseConfigured && (
            <button
              type="button"
              onClick={onResetDemo}
              className="mt-4 text-[13px] text-red-600 font-medium hover:underline"
            >
              Reset demo data
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() =>
              onSave({
                ...settings,
                geminiModel: model,
                aiAutonomy: autonomy,
                syncIntervalMinutes: syncMinutes,
              })
            }
            className="bg-[#000000] text-white px-5 py-2 rounded text-[14px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
