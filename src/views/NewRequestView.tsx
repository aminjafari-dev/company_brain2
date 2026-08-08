import React, { useState } from 'react';
import { FeatureRequest, MatchedFile, TabType } from '../types';

interface NewRequestViewProps {
  currentRequest: FeatureRequest | null;
  onAnalyzeNewRequest: (promptText: string) => Promise<void> | void;
  onViewFile: (file: MatchedFile) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  currentRequest,
  onAnalyzeNewRequest,
  onViewFile,
  onNavigateTab,
}) => {
  const [promptText, setPromptText] = useState(
    'Add Apple Pay support to the main checkout flow...'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!promptText.trim()) return;
    setIsAnalyzing(true);
    try {
      await onAnalyzeNewRequest(promptText);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!currentRequest) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8 text-[#76777d]">
        Loading request workspace…
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#45464d] text-[12px] font-semibold uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[16px] text-[#6063ee] filled">auto_awesome</span>
          <span>AI Request Analysis</span>
          <span className="px-2 py-0.5 bg-[#e6e8ea] rounded-full text-[#191c1e] text-[11px] font-medium">
            Draft
          </span>
        </div>
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">New Feature Request</h1>
        <p className="text-[15px] text-[#45464d] mt-1 max-w-2xl">
          Describe what you want to build in plain English, and the AI will analyze the codebase to determine the necessary changes.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Input Area (Left Column) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 flex flex-col h-full shadow-2xs">
            <label htmlFor="request-input" className="text-[18px] font-semibold text-[#191c1e] mb-4 block">
              What would you like to build?
            </label>
            <textarea
              id="request-input"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., Add Apple Pay support to the main checkout flow..."
              className="w-full flex-1 min-h-[220px] p-4 bg-[#f7f9fb] border border-[#c6c6cd] rounded text-[15px] text-[#191c1e] focus:border-[#6063ee] focus:ring-1 focus:ring-[#6063ee]/20 outline-none resize-none font-sans"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-[#000000] text-white px-4 py-2.5 rounded text-[14px] font-medium flex items-center gap-2 hover:bg-[#2d3133] transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAnalyzing ? 'sync' : 'model_training'}
                </span>
                <span>{isAnalyzing ? 'Analyzing Codebase...' : 'Analyze Request'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Results (Right Column) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* Result Header */}
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-[#191c1e]">{currentRequest.title}</h2>
                <span className="font-mono text-[13px] text-[#45464d] bg-[#f7f9fb] px-2 py-0.5 rounded border border-[#c6c6cd]/50">
                  {currentRequest.id}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-[#e6e8ea] text-[#191c1e] rounded-full text-[12px] font-medium">
              <span className="material-symbols-outlined text-[14px] text-[#6063ee] filled">check_circle</span>
              <span>AI Analyzed</span>
            </div>
          </div>

          {/* AI Understanding & Product Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Understanding */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-[16px] text-[#6063ee]">psychology</span>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#45464d]">AI Understanding</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-[14px] font-semibold block text-[#191c1e]">Objective</span>
                  <p className="text-[13px] text-[#45464d] leading-normal">{currentRequest.objective}</p>
                </div>
                <div>
                  <span className="text-[14px] font-semibold block text-[#191c1e]">Business Goal</span>
                  <p className="text-[13px] text-[#45464d] leading-normal">{currentRequest.businessGoal}</p>
                </div>
              </div>
            </div>

            {/* Product Context */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-[16px] text-[#6063ee]">account_tree</span>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#45464d]">Product Context</h3>
              </div>
              <div className="space-y-2.5">
                {currentRequest.productContext?.map((ctx, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#76777d] mt-0.5">info</span>
                    <p className="text-[13px] text-[#45464d] leading-tight">{ctx}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Impact Flow Visualization */}
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 shadow-2xs">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#45464d] mb-4">
              Technical Impact Flow
            </h3>
            <div className="flex items-center justify-between text-[13px] overflow-x-auto pb-2 gap-2">
              <div className="flex flex-col items-center gap-2 min-w-[100px]">
                <div className="w-12 h-12 bg-[#f7f9fb] rounded flex items-center justify-center border border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-[#191c1e]">smartphone</span>
                </div>
                <span className="text-center font-medium text-[#191c1e]">Checkout Screen</span>
              </div>

              <div className="flex-1 h-[1px] bg-[#c6c6cd] mx-2 relative min-w-[30px]">
                <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-[#76777d]">
                  arrow_forward
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 min-w-[100px]">
                <div className="w-12 h-12 bg-[#e1e0ff] rounded flex items-center justify-center border border-[#6063ee] relative">
                  <span className="material-symbols-outlined text-[#2f2ebe]">settings_applications</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4648d4] rounded-full border border-white" />
                </div>
                <span className="text-center font-semibold text-[#4648d4]">
                  Payment
                  <br />
                  Controller
                </span>
              </div>

              <div className="flex-1 h-[1px] bg-[#c6c6cd] mx-2 relative min-w-[30px]">
                <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-[#76777d]">
                  arrow_forward
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 min-w-[100px]">
                <div className="w-12 h-12 bg-[#e1e0ff] rounded flex items-center justify-center border border-[#6063ee] relative">
                  <span className="material-symbols-outlined text-[#2f2ebe]">api</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4648d4] rounded-full border border-white" />
                </div>
                <span className="text-center font-semibold text-[#4648d4]">
                  Payment
                  <br />
                  Service
                </span>
              </div>

              <div className="flex-1 h-[1px] bg-[#c6c6cd] mx-2 relative min-w-[30px]">
                <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-[#76777d]">
                  arrow_forward
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 min-w-[100px]">
                <div className="w-12 h-12 bg-[#f7f9fb] rounded flex items-center justify-center border border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-[#191c1e]">cloud</span>
                </div>
                <span className="text-center font-medium text-[#191c1e]">Stripe SDK</span>
              </div>
            </div>
            <p className="text-[12px] text-[#76777d] mt-3 text-center">
              Highlighted nodes indicate required code modifications.
            </p>
          </div>

          {/* Code Intelligence Panel */}
          <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-[#f7f9fb] border-b border-[#c6c6cd] px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#6063ee]">code</span>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#45464d]">
                  AI Code Analysis
                </h3>
              </div>
              <span className="text-[12px] text-[#76777d] font-medium">Relevant Files</span>
            </div>

            <div className="divide-y divide-[#c6c6cd]/50">
              {currentRequest.matchedFiles?.map((file, idx) => (
                <div key={idx} className="p-4 hover:bg-[#f7f9fb] transition-colors flex items-start justify-between group">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#76777d] mt-0.5">description</span>
                    <div>
                      <div className="font-mono text-[13px] font-semibold text-[#191c1e]">{file.path}</div>
                      <div className="text-[13px] text-[#45464d] mt-1">{file.description}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                    <div className="px-2 py-0.5 bg-[#e1e0ff] text-[#2f2ebe] rounded text-[11px] font-semibold">
                      {file.matchPercentage}% Match
                    </div>
                    <button
                      onClick={() => onViewFile(file)}
                      className="text-[#4648d4] text-[12px] font-medium hover:underline opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      View File
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Navigation CTA */}
          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => onNavigateTab('requests')}
              className="bg-[#000000] text-white px-5 py-2 rounded text-[14px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>Proceed to PM Review</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
