import React, { useState } from 'react';
import { ChatMessage, TabType } from '../types';

interface AIAssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  onNavigateTab: (tab: TabType) => void;
  onOpenDependencyGraph: () => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  messages,
  onSendMessage,
  onNavigateTab,
  onOpenDependencyGraph,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const text = inputText.trim();
    setInputText('');
    try {
      await onSendMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePillClick = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className="max-w-[1024px] mx-auto px-6 py-8 w-full flex flex-col min-h-[calc(100vh-120px)] animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-8 text-center pt-4">
        <h2 className="text-[32px] font-semibold text-[#191c1e] mb-1 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[#6063ee] filled text-[28px]">auto_awesome</span>
          <span>AI Assistant</span>
        </h2>
        <p className="text-[15px] text-[#45464d]">
          Ask anything about your company, projects, code, or product history.
        </p>
      </div>

      {/* Input Area */}
      <div className="max-w-2xl mx-auto w-full mb-8">
        <div className="bg-white border border-[#c6c6cd] rounded-xl shadow-xs focus-within:border-[#6063ee] focus-within:ring-2 focus-within:ring-[#e1e0ff] transition-all">
          <div className="flex items-start p-3">
            <span className="material-symbols-outlined text-[#6063ee] mt-1 ml-1 mr-3 text-[20px]">
              arrow_back_ios_new
            </span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your company anything..."
              rows={2}
              className="w-full bg-transparent border-none p-0 resize-none text-[15px] text-[#191c1e] placeholder-[#76777d] focus:outline-none"
            />
          </div>

          <div className="flex justify-between items-center px-4 py-2 border-t border-[#c6c6cd]/50 bg-[#f7f9fb] rounded-b-xl">
            <button
              onClick={() => alert('Context options: Entire Repository, Jira Board, Confluence Docs, Slack Logs')}
              className="text-[#45464d] hover:text-[#191c1e] transition-colors flex items-center gap-1 bg-[#f2f4f6] px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer border border-[#c6c6cd]/40"
            >
              <span className="material-symbols-outlined text-[14px]">add_circle</span>
              <span>Context</span>
            </button>

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSubmitting}
              className="bg-[#000000] text-white text-[13px] font-medium px-4 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#2d3133] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Analyzing...' : 'Submit'}</span>
              <span className="material-symbols-outlined text-[14px]">send</span>
            </button>
          </div>
        </div>

        {/* Suggestion Pills */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => handlePillClick('Why did we choose Stripe?')}
            className="px-3 py-1.5 rounded-full border border-[#c6c6cd] bg-white text-[#45464d] text-[13px] hover:border-[#6063ee] hover:text-[#6063ee] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>Why did we choose Stripe?</span>
          </button>
          <button
            onClick={() => handlePillClick('How would we implement Apple Pay?')}
            className="px-3 py-1.5 rounded-full border border-[#c6c6cd] bg-white text-[#45464d] text-[13px] hover:border-[#6063ee] hover:text-[#6063ee] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">integration_instructions</span>
            <span>How would we implement Apple Pay?</span>
          </button>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-6 pb-12">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.sender === 'user' ? (
              <div className="flex gap-3 justify-end">
                <div className="bg-[#f2f4f6] border border-[#c6c6cd]/60 rounded-2xl rounded-tr-xs p-4 max-w-[80%] shadow-2xs">
                  <p className="text-[15px] text-[#191c1e]">{msg.text}</p>
                </div>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0epFgq0-fheOL-FKl3I5ENZnRF8rd6XTmgtRT9hZ-NROJo9Oe_gEiHFjthT_fH1DSsFZwEZ153hHgSIVRh465faOSVZWHpXegdVjsGsM37v9XWCZucPRoxKiJIvKti8dpvqaxwIecC7Ksejwl2XfA3Eg5fL_KTghN6EZ5Tw4CozfRxItJXoyk3vdGQF69unig9KaqW6CrirqjS9cf4KbbYcv4io6fOL3qOzr8ABdnC4OGxKO4OJAM2Q"
                  alt="User"
                  className="w-8 h-8 rounded-full border border-[#c6c6cd] shrink-0 object-cover"
                />
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#e1e0ff] flex items-center justify-center shrink-0 border border-[#6063ee]/30">
                  <span className="material-symbols-outlined text-[#2f2ebe] text-[18px] filled">auto_awesome</span>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12px] text-[#191c1e] uppercase tracking-wider">Brain</span>
                    <span className="w-1 h-1 rounded-full bg-[#c6c6cd]" />
                    <span className="text-[12px] text-[#45464d] flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px] text-[#6063ee]">verified</span>
                      AI Confidence: 94%
                    </span>
                  </div>

                  <div className="bg-white border border-[#c6c6cd] rounded-xl overflow-hidden shadow-2xs">
                    {msg.analysisCard && (
                      <div className="p-4 border-b border-[#c6c6cd]/60 bg-[#f7f9fb] flex items-center justify-between">
                        <h3 className="text-[16px] text-[#191c1e] font-semibold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#6063ee] text-[20px]">
                            account_balance_wallet
                          </span>
                          {msg.analysisCard.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-[#e6e8ea] text-[#45464d] text-[11px] font-medium border border-[#c6c6cd]/50">
                          {msg.analysisCard.status}
                        </span>
                      </div>
                    )}

                    <div className="p-4 text-[15px] text-[#191c1e] leading-relaxed">
                      <p className="mb-4">{msg.text}</p>

                      {msg.analysisCard && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                          {/* Affected Systems */}
                          <div className="border border-[#c6c6cd]/60 rounded-lg p-3 bg-[#f7f9fb]">
                            <h4 className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">account_tree</span>
                              Affected Systems
                            </h4>
                            <ul className="space-y-1.5 text-[13px] text-[#191c1e]">
                              {msg.analysisCard.affectedSystems.map((sys, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#6063ee]" />
                                  <span>{sys}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Context */}
                          <div className="border border-[#c6c6cd]/60 rounded-lg p-3 bg-[#f7f9fb]">
                            <h4 className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">info</span>
                              Context
                            </h4>
                            <ul className="space-y-2 text-[13px]">
                              {msg.analysisCard.relatedJira && (
                                <li className="flex justify-between items-center">
                                  <span className="text-[#45464d]">Related Work</span>
                                  <a
                                    onClick={() => onNavigateTab('jira')}
                                    className="text-[#4648d4] hover:underline font-mono text-[12px] font-semibold cursor-pointer"
                                  >
                                    {msg.analysisCard.relatedJira}
                                  </a>
                                </li>
                              )}
                              <li className="flex justify-between items-center">
                                <span className="text-[#45464d]">Est. Complexity</span>
                                <span className="px-2 py-0.5 rounded bg-[#eceef0] text-[#191c1e] font-medium text-[12px]">
                                  {msg.analysisCard.estComplexity}
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-[#f7f9fb] border-t border-[#c6c6cd]/60 flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => onNavigateTab('new-request')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000000] text-white text-[13px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_task</span>
                        <span>Create Request</span>
                      </button>
                      <button
                        onClick={onOpenDependencyGraph}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c6c6cd] text-[#191c1e] hover:bg-[#f2f4f6] transition-colors text-[13px] font-medium cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">code</span>
                        <span>Explore Code Impact</span>
                      </button>

                      <div className="flex-1" />

                      <button
                        onClick={() => alert('Response copied to clipboard')}
                        className="p-1.5 rounded hover:bg-[#f2f4f6] text-[#45464d] transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-[#f2f4f6] text-[#45464d] transition-colors cursor-pointer"
                        title="Thumbs up"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-[#f2f4f6] text-[#45464d] transition-colors cursor-pointer"
                        title="Thumbs down"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
