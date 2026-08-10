import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  ClarificationAnswer,
  ClarificationSession,
  Conversation,
  DraftTask,
  TabType,
} from '../types';
import { MarkdownContent } from '../components/MarkdownContent';

interface AIAssistantViewProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  onNewChat: () => Promise<void> | void;
  onSelectChat: (conversationId: string) => Promise<void> | void;
  onFinalizeToJira: (draftTask: DraftTask) => Promise<void> | void;
  onSaveClarificationProgress: (
    messageId: string,
    clarification: ClarificationSession
  ) => Promise<void> | void;
  onSubmitClarificationAnswers: (
    messageId: string,
    answers: Record<string, ClarificationAnswer>
  ) => Promise<void> | void;
  onNavigateTab: (tab: TabType) => void;
}

function formatChatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function resolveMode(msg: ChatMessage): 'chat' | 'clarify' | 'task_ready' | 'finalized' {
  if (msg.state === 'finalized') return 'finalized';
  if (msg.mode) return msg.mode;
  if (msg.state === 'ready_to_finalize') return 'task_ready';
  if (msg.state === 'asking_question' || msg.clarification) return 'clarify';
  return 'chat';
}

const ClarificationCard: React.FC<{
  messageId: string;
  session: ClarificationSession;
  disabled?: boolean;
  onProgress: (session: ClarificationSession) => Promise<void> | void;
  onComplete: (answers: Record<string, ClarificationAnswer>) => Promise<void> | void;
}> = ({ messageId, session, disabled, onProgress, onComplete }) => {
  const index = Math.min(
    session.currentIndex ?? 0,
    Math.max(0, session.questions.length - 1)
  );
  const question = session.questions[index];
  const total = session.questions.length;
  const existing = session.answers?.[question?.id ?? ''];

  const [selection, setSelection] = useState<string | 'custom' | null>(() => {
    if (existing?.customText) return 'custom';
    if (existing?.optionId) return existing.optionId;
    return null;
  });
  const [customText, setCustomText] = useState(existing?.customText ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ans = session.answers?.[question?.id ?? ''];
    if (ans?.customText) {
      setSelection('custom');
      setCustomText(ans.customText);
    } else if (ans?.optionId) {
      setSelection(ans.optionId);
      setCustomText('');
    } else {
      setSelection(null);
      setCustomText('');
    }
  }, [messageId, question?.id, session.answers]);

  if (!question || session.status === 'completed') {
    return (
      <div className="border border-[#c6c6cd]/60 rounded-lg p-3 bg-[#f7f9fb] text-[13px] text-[#45464d]">
        Clarification complete — drafting your Jira task…
      </div>
    );
  }

  const canSubmit =
    selection === 'custom' ? customText.trim().length > 0 : selection !== null;

  const handleContinue = async () => {
    if (!canSubmit || busy || disabled) return;
    setBusy(true);
    try {
      const answer: ClarificationAnswer =
        selection === 'custom'
          ? { customText: customText.trim() }
          : { optionId: selection ?? undefined };

      const nextAnswers = {
        ...(session.answers ?? {}),
        [question.id]: answer,
      };
      const isLast = index >= total - 1;

      if (isLast) {
        await onComplete(nextAnswers);
      } else {
        await onProgress({
          ...session,
          answers: nextAnswers,
          currentIndex: index + 1,
          status: 'in_progress',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[#c6c6cd]/60 rounded-lg overflow-hidden bg-[#f7f9fb]">
      <div className="px-3 py-2 border-b border-[#c6c6cd]/50 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider">
          Clarifying details
        </p>
        <span className="text-[12px] font-medium text-[#6063ee]">
          Question {index + 1} of {total}
        </span>
      </div>

      <div className="p-3 space-y-3">
        <div className="h-1.5 rounded-full bg-[#e6e8ea] overflow-hidden">
          <div
            className="h-full bg-[#6063ee] transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <p className="text-[15px] font-medium text-[#191c1e] leading-snug">{question.prompt}</p>

        <div className="space-y-2" role="radiogroup" aria-label={question.prompt}>
          {question.options.map((opt) => {
            const selected = selection === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy || disabled}
                onClick={() => setSelection(opt.id)}
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                  selected
                    ? 'border-[#6063ee] bg-white ring-2 ring-[#e1e0ff]'
                    : 'border-[#c6c6cd]/70 bg-white hover:border-[#6063ee]/60'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selected ? 'border-[#6063ee]' : 'border-[#c6c6cd]'
                  }`}
                >
                  {selected && <span className="w-2 h-2 rounded-full bg-[#6063ee]" />}
                </span>
                <span className="text-[14px] text-[#191c1e]">{opt.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            role="radio"
            aria-checked={selection === 'custom'}
            disabled={busy || disabled}
            onClick={() => setSelection('custom')}
            className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
              selection === 'custom'
                ? 'border-[#6063ee] bg-white ring-2 ring-[#e1e0ff]'
                : 'border-[#c6c6cd]/70 bg-white hover:border-[#6063ee]/60'
            }`}
          >
            <span
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                selection === 'custom' ? 'border-[#6063ee]' : 'border-[#c6c6cd]'
              }`}
            >
              {selection === 'custom' && <span className="w-2 h-2 rounded-full bg-[#6063ee]" />}
            </span>
            <span className="text-[14px] text-[#191c1e] font-medium">Write my own answer</span>
          </button>

          {selection === 'custom' && (
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={3}
              disabled={busy || disabled}
              placeholder="Type your answer…"
              className="w-full mt-1 rounded-lg border border-[#c6c6cd] bg-white px-3 py-2 text-[14px] text-[#191c1e] placeholder-[#76777d] focus:outline-none focus:border-[#6063ee] focus:ring-2 focus:ring-[#e1e0ff] resize-none"
            />
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canSubmit || busy || disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000000] text-white text-[13px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>
              {busy
                ? index >= total - 1
                  ? 'Drafting…'
                  : 'Saving…'
                : index >= total - 1
                  ? 'Finish & draft task'
                  : 'Continue'}
            </span>
            <span className="material-symbols-outlined text-[16px]">
              {index >= total - 1 ? 'task_alt' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  conversations,
  activeConversationId,
  messages,
  onSendMessage,
  onNewChat,
  onSelectChat,
  onFinalizeToJira,
  onSaveClarificationProgress,
  onSubmitClarificationAnswers,
  onNavigateTab,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalizingMsgId, setFinalizingMsgId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  const activeClarification = useMemo(() => {
    const latestAi = [...messages].reverse().find((m) => m.sender === 'ai');
    if (!latestAi) return null;
    if (resolveMode(latestAi) !== 'clarify') return null;
    if (!latestAi.clarification || latestAi.clarification.status === 'completed') return null;
    return latestAi;
  }, [messages]);

  const composerLocked = Boolean(activeClarification);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeClarification?.clarification?.currentIndex]);

  const handleSend = async () => {
    if (!inputText.trim() || isSubmitting || composerLocked) return;
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

  const handleFinalize = async (msg: ChatMessage) => {
    if (!msg.draftTask || finalizingMsgId) return;
    setFinalizingMsgId(msg.id);
    try {
      await onFinalizeToJira(msg.draftTask);
    } catch {
      // Toast is shown by the store; keep the draft so the client can retry.
    } finally {
      setFinalizingMsgId(null);
    }
  };

  const handleNewChat = async () => {
    setInputText('');
    await onNewChat();
  };

  const latestReadyId = [...messages]
    .reverse()
    .find((m) => resolveMode(m) === 'task_ready' && m.draftTask)?.id;

  const composer = (
    <div
      className={`bg-white border border-[#c6c6cd] rounded-xl shadow-xs transition-all ${
        composerLocked
          ? 'opacity-60'
          : 'focus-within:border-[#6063ee] focus-within:ring-2 focus-within:ring-[#e1e0ff]'
      }`}
    >
      <div className="flex items-start p-3">
        <span className="material-symbols-outlined text-[#6063ee] mt-1 ml-1 mr-3 text-[20px]">
          edit_note
        </span>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            composerLocked
              ? 'Answer the clarifying questions above to continue…'
              : 'Ask a question, or describe a feature to turn into a Jira task…'
          }
          rows={2}
          disabled={composerLocked || isSubmitting}
          className="w-full bg-transparent border-none p-0 resize-none text-[15px] text-[#191c1e] placeholder-[#76777d] focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex justify-between items-center px-4 py-2 border-t border-[#c6c6cd]/50 bg-[#f7f9fb] rounded-b-xl">
        <span className="text-[12px] text-[#76777d]">
          {composerLocked
            ? 'Complete the questionnaire to draft a task'
            : 'AI picks chat, clarify, or draft automatically'}
        </span>

        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || isSubmitting || composerLocked}
          className="bg-[#000000] text-white text-[13px] font-medium px-4 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#2d3133] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span>{isSubmitting ? 'Thinking...' : 'Submit'}</span>
          <span className="material-symbols-outlined text-[14px]">send</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] w-full flex animate-in fade-in duration-200 overflow-hidden">
      <aside
        className={`${
          historyOpen ? 'w-[260px]' : 'w-0'
        } shrink-0 border-r border-[#c6c6cd]/60 bg-[#f7f9fb] flex flex-col transition-[width] duration-200 overflow-hidden`}
      >
        <div className="p-3 border-b border-[#c6c6cd]/50 flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#000000] text-white text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-[#2d3133] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New chat
          </button>
        </div>
        <div className="px-3 pt-3 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#76777d]">
            History
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-[#76777d]">No chats yet</p>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeConversationId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectChat(c.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-white border border-[#c6c6cd] shadow-2xs'
                      : 'hover:bg-white/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${
                        active ? 'text-[#6063ee]' : 'text-[#76777d]'
                      }`}
                    >
                      chat_bubble
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13px] truncate ${
                          active ? 'font-semibold text-[#191c1e]' : 'text-[#45464d]'
                        }`}
                      >
                        {c.title || 'New conversation'}
                      </p>
                      <p className="text-[11px] text-[#76777d] mt-0.5">
                        {formatChatTime(c.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#f7f9fb]">
        <div className="shrink-0 px-4 py-3 border-b border-[#c6c6cd]/50 bg-white/80 backdrop-blur-sm flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-[#f2f4f6] text-[#45464d] cursor-pointer"
            title={historyOpen ? 'Hide history' : 'Show history'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {historyOpen ? 'left_panel_close' : 'left_panel_open'}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#191c1e] truncate flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#6063ee] filled text-[18px]">
                auto_awesome
              </span>
              {conversations.find((c) => c.id === activeConversationId)?.title || 'AI Assistant'}
            </h2>
            <p className="text-[12px] text-[#76777d] truncate">
              Chat, clarify with options, or draft a Jira task — chosen automatically
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c6c6cd] text-[13px] font-medium text-[#191c1e] hover:bg-[#f2f4f6] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
            {!hasMessages && (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e1e0ff] border border-[#6063ee]/30 mb-4">
                  <span className="material-symbols-outlined text-[#2f2ebe] text-[24px] filled">
                    auto_awesome
                  </span>
                </div>
                <h3 className="text-[22px] font-semibold text-[#191c1e] mb-1">
                  How can I help?
                </h3>
                <p className="text-[14px] text-[#45464d] max-w-md mx-auto mb-6">
                  Ask for information, or describe a feature. If details are missing I will walk
                  you through options; if the request is complete I will draft a Jira task.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePillClick('I need Apple Pay on iOS checkout for customers')}
                    className="px-3 py-1.5 rounded-full border border-[#c6c6cd] bg-white text-[#45464d] text-[13px] hover:border-[#6063ee] hover:text-[#6063ee] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_card</span>
                    <span>Add Apple Pay on iOS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePillClick('What does our Q3 strategy say about checkout conversion?')
                    }
                    className="px-3 py-1.5 rounded-full border border-[#c6c6cd] bg-white text-[#45464d] text-[13px] hover:border-[#6063ee] hover:text-[#6063ee] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">menu_book</span>
                    <span>Ask about strategy</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.sender === 'user') {
                // Hide the long structured answer dump in the thread — shown as Q&A card instead.
                const isAnswerDump = msg.text.startsWith(
                  'Please create a complete Jira task from this intake.'
                );
                if (isAnswerDump) {
                  return (
                    <div key={msg.id} className="flex gap-3 justify-end">
                      <div className="bg-[#f2f4f6] border border-[#c6c6cd]/60 rounded-2xl rounded-tr-xs p-4 max-w-[80%] shadow-2xs">
                        <p className="text-[15px] text-[#191c1e]">
                          Submitted clarification answers
                        </p>
                      </div>
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0epFgq0-fheOL-FKl3I5ENZnRF8rd6XTmgtRT9hZ-NROJo9Oe_gEiHFjthT_fH1DSsFZwEZ153hHgSIVRh465faOSVZWHpXegdVjsGsM37v9XWCZucPRoxKiJIvKti8dpvqaxwIecC7Ksejwl2XfA3Eg5fL_KTghN6EZ5Tw4CozfRxItJXoyk3vdGQF69unig9KaqW6CrirqjS9cf4KbbYcv4io6fOL3qOzr8ABdnC4OGxKO4OJAM2Q"
                        alt="User"
                        className="w-8 h-8 rounded-full border border-[#c6c6cd] shrink-0 object-cover"
                      />
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="flex gap-3 justify-end">
                    <div className="bg-[#f2f4f6] border border-[#c6c6cd]/60 rounded-2xl rounded-tr-xs p-4 max-w-[80%] shadow-2xs">
                      <p className="text-[15px] text-[#191c1e] whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0epFgq0-fheOL-FKl3I5ENZnRF8rd6XTmgtRT9hZ-NROJo9Oe_gEiHFjthT_fH1DSsFZwEZ153hHgSIVRh465faOSVZWHpXegdVjsGsM37v9XWCZucPRoxKiJIvKti8dpvqaxwIecC7Ksejwl2XfA3Eg5fL_KTghN6EZ5Tw4CozfRxItJXoyk3vdGQF69unig9KaqW6CrirqjS9cf4KbbYcv4io6fOL3qOzr8ABdnC4OGxKO4OJAM2Q"
                      alt="User"
                      className="w-8 h-8 rounded-full border border-[#c6c6cd] shrink-0 object-cover"
                    />
                  </div>
                );
              }

              const mode = resolveMode(msg);
              const isActiveClarify =
                activeClarification?.id === msg.id &&
                msg.clarification &&
                msg.clarification.status === 'in_progress';

              const statusLabel =
                mode === 'clarify'
                  ? 'Clarifying'
                  : mode === 'task_ready'
                    ? 'Ready to create'
                    : mode === 'finalized'
                      ? 'Created on Jira'
                      : 'Chat';

              const statusIcon =
                mode === 'clarify'
                  ? 'help'
                  : mode === 'task_ready'
                    ? 'task_alt'
                    : mode === 'finalized'
                      ? 'check_circle'
                      : 'chat';

              return (
                <div key={msg.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#e1e0ff] flex items-center justify-center shrink-0 border border-[#6063ee]/30">
                    <span className="material-symbols-outlined text-[#2f2ebe] text-[18px] filled">
                      auto_awesome
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[12px] text-[#191c1e] uppercase tracking-wider">
                        Brain
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#c6c6cd]" />
                      <span className="text-[12px] text-[#45464d] flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[14px] text-[#6063ee]">
                          {statusIcon}
                        </span>
                        {statusLabel}
                      </span>
                      {msg.responseSource === 'ai' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#c6c6cd]" />
                          <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#1b5e20]"
                            title="Generated by the live Gemini AI proxy"
                          >
                            From AI
                          </span>
                        </>
                      )}
                      {msg.responseSource === 'offline' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#c6c6cd]" />
                          <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#fff3e0] text-[#e65100]"
                            title="Local offline fallback — AI proxy was unavailable"
                          >
                            Offline (not AI)
                          </span>
                        </>
                      )}
                    </div>

                    <div className="bg-white border border-[#c6c6cd] rounded-xl overflow-hidden shadow-2xs">
                      <div className="p-4 text-[15px] text-[#191c1e] leading-relaxed space-y-3">
                        <MarkdownContent
                          content={
                            msg.clarification?.intro && mode === 'clarify'
                              ? msg.clarification.intro
                              : msg.text
                          }
                        />

                        {mode === 'clarify' && msg.clarification && (
                          <>
                            {isActiveClarify ? (
                              <ClarificationCard
                                messageId={msg.id}
                                session={msg.clarification}
                                onProgress={(session) =>
                                  onSaveClarificationProgress(msg.id, session)
                                }
                                onComplete={(answers) =>
                                  onSubmitClarificationAnswers(msg.id, answers)
                                }
                              />
                            ) : msg.clarification.status === 'completed' ? (
                              <div className="border border-[#c6c6cd]/60 rounded-lg p-3 bg-[#f7f9fb] text-[13px] text-[#45464d]">
                                Answers submitted
                              </div>
                            ) : null}
                          </>
                        )}

                        {mode === 'task_ready' && msg.draftTask && (
                          <div className="border border-[#c6c6cd]/60 rounded-lg p-3 bg-[#f7f9fb] space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider mb-1">
                                  Draft Jira task
                                </p>
                                <h4 className="text-[15px] font-semibold text-[#191c1e]">
                                  {msg.draftTask.title}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-[#eceef0] text-[#191c1e] font-medium text-[12px] shrink-0">
                                {msg.draftTask.effort}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#45464d]">{msg.draftTask.summary}</p>
                            {msg.draftTask.acceptanceCriteria.length > 0 && (
                              <ul className="space-y-1.5 text-[13px] text-[#191c1e]">
                                {msg.draftTask.acceptanceCriteria.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-[#6063ee] mt-0.5">
                                      check
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {msg.jiraKey && (
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="text-[#45464d]">Jira issue</span>
                            {msg.jiraUrl ? (
                              <a
                                href={msg.jiraUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#4648d4] hover:underline font-mono text-[12px] font-semibold"
                              >
                                {msg.jiraKey}
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('jira')}
                                className="text-[#4648d4] hover:underline font-mono text-[12px] font-semibold cursor-pointer"
                              >
                                {msg.jiraKey}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {(mode === 'task_ready' || mode === 'finalized') && (
                        <div className="p-3 bg-[#f7f9fb] border-t border-[#c6c6cd]/60 flex flex-wrap gap-2 items-center">
                          {mode === 'task_ready' &&
                            msg.draftTask &&
                            msg.id === latestReadyId && (
                              <button
                                type="button"
                                onClick={() => handleFinalize(msg)}
                                disabled={finalizingMsgId === msg.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000000] text-white text-[13px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  add_task
                                </span>
                                <span>
                                  {finalizingMsgId === msg.id
                                    ? 'Creating...'
                                    : 'Create on Jira'}
                                </span>
                              </button>
                            )}

                          {mode === 'finalized' && msg.jiraKey && (
                            <a
                              href={msg.jiraUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => {
                                if (!msg.jiraUrl) {
                                  e.preventDefault();
                                  onNavigateTab('jira');
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000000] text-white text-[13px] font-medium hover:bg-[#2d3133] transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                open_in_new
                              </span>
                              <span>Open in Jira</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-[#c6c6cd]/50 bg-[#f7f9fb]/95 backdrop-blur-sm px-6 py-4">
          <div className="max-w-3xl mx-auto w-full">{composer}</div>
        </div>
      </div>
    </div>
  );
};
