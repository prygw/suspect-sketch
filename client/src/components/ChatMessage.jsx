function ChatMessage({ type, text }) {
  if (type === 'question') {
    return (
      <div className="flex flex-col items-start">
        <span className="text-[0.6875rem] text-tertiary font-semibold uppercase tracking-wider ml-4 mb-1 font-label">
          Interviewer
        </span>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 text-on-surface max-w-[85%]">
          <p className="text-sm font-body">{text}</p>
        </div>
      </div>
    );
  }

  if (type === 'skip') {
    return (
      <div className="flex flex-col items-end ml-auto">
        <span className="text-[0.6875rem] text-tertiary font-semibold uppercase tracking-wider mr-4 mb-1 font-label">
          Witness
        </span>
        <div className="bg-surface-container-low text-on-surface-variant p-4 rounded-xl border border-dashed border-outline-variant italic max-w-[85%]">
          <p className="text-sm font-body">{text}</p>
        </div>
      </div>
    );
  }

  // type === 'answer'
  return (
    <div className="flex flex-col items-end ml-auto">
      <span className="text-[0.6875rem] text-tertiary font-semibold uppercase tracking-wider mr-4 mb-1 font-label">
        Witness
      </span>
      <div className="primary-gradient text-on-primary p-4 rounded-xl shadow-md max-w-[85%]">
        <p className="text-sm font-body">{text}</p>
      </div>
    </div>
  );
}

export default ChatMessage;
