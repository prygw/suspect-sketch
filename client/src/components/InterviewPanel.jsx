import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

function InterviewPanel({
  session,
  currentQuestion,
  phase,
  isSending,
  error,
  onSubmitAnswer,
  onRetry,
  onSkip,
  onSubmitRefinement,
  onFinish,
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.interviewHistory?.length, currentQuestion]);

  // Focus input after sending
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    if (phase === 'refinement') {
      onSubmitRefinement(input.trim(), null);
    } else {
      onSubmitAnswer(input.trim());
    }
    setInput('');
  };

  const handleSkip = () => {
    if (isSending) return;
    onSkip();
  };

  // Build message list from interview history
  const messages = [];
  if (session?.interviewHistory) {
    for (const entry of session.interviewHistory) {
      messages.push({ type: 'question', text: entry.question });
      if (entry.skipped) {
        messages.push({ type: 'skip', text: "I don't remember" });
      } else if (entry.answer) {
        messages.push({ type: 'answer', text: entry.answer });
      }
    }
  }
  if (currentQuestion) {
    messages.push({ type: 'question', text: currentQuestion });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error bar */}
      {error && (
        <div className="bg-error text-on-error px-6 py-2 flex items-center justify-between text-sm font-medium z-40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">report</span>
            {error}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline font-bold hover:opacity-80 transition-opacity ml-3"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <ChatMessage key={i} type={msg.type} text={msg.text} />
        ))}
        {isSending && (
          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
            <span className="animate-pulse font-body">Thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="p-6 bg-surface-container-low border-t border-outline-variant/20 space-y-4 flex-shrink-0">
        {/* Action buttons row */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={isSending}
            className="bg-surface-container-high text-on-secondary-container px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-bright disabled:opacity-50 transition-colors font-label"
          >
            I don&apos;t remember
          </button>
          {session?.interviewHistory?.length >= 5 && (
            <button
              disabled={isSending}
              onClick={onFinish}
              className="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity ml-auto font-label"
            >
              Finish &amp; Export
            </button>
          )}
        </div>

        {/* Text input with embedded send button */}
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                phase === 'refinement'
                  ? "Describe what needs to change..."
                  : "Describe the feature..."
              }
              disabled={isSending}
              className="w-full bg-surface-container-lowest rounded-xl px-4 py-4 pr-16 text-on-surface placeholder:text-outline/60 border-b-2 border-transparent focus:border-primary focus:outline-none transition-all shadow-sm disabled:opacity-50 font-body text-sm"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="absolute right-2 primary-gradient text-on-primary w-10 h-10 rounded-lg flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterviewPanel;
