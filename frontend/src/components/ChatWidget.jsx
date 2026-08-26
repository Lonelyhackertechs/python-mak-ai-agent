import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { pythonApi } from '../api/api';

// Key used to hand a draft message across the login redirect.
// sessionStorage (not localStorage) because it only needs to survive
// this one round trip, not persist indefinitely.
const PENDING_MESSAGE_KEY = 'mak_pending_message';

export default function ChatWidget({ embedded = false, dark = false }) {
  // On the landing page we render "embedded" and always open.
  // Elsewhere (e.g. dashboard) it can still behave as the floating widget.
  const [open, setOpen] = useState(embedded);

  const [msgs, setMsgs] = useState([
    {
      from: 'bot',
      text: "Hi, I'm Mak Agent. Ask me anything about navigating your portal — fees, registration, results, timetables."
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // If we're returning from a login that was triggered by trying to chat,
  // restore the message the user was typing so they don't have to retype it.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_MESSAGE_KEY);
    if (pending && localStorage.getItem('token')) {
      setInput(pending);
      sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    }
  }, []);

  const send = async () => {
    if (!input.trim() || loading) {
      return;
    }

    const token = localStorage.getItem('token');

    // Not logged in yet — send them to login, but hang on to what they
    // typed so they land back here with it ready to go.
    if (!token) {
      sessionStorage.setItem(PENDING_MESSAGE_KEY, input);
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const userMessage = input;

    setMsgs((messages) => [...messages, { from: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await pythonApi.post(
        '/chat',
        { message: userMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botResponse = res.data.response;

      setMsgs((messages) => [
        ...messages,
        { from: 'bot', text: botResponse || 'I received an empty response.' }
      ]);
    }  catch (e) {
  console.error('CHAT ERROR:', e.response?.data || e.message);

  // JWT expired/invalid
  if (e.response?.status === 401) {
    localStorage.removeItem('token');
    sessionStorage.setItem(PENDING_MESSAGE_KEY, userMessage);

    navigate('/login', {
      state: { from: location.pathname }
    });

    return;
  }

  // Gemini/API rate limit
  if (e.response?.status === 429) {
    setMsgs((messages) => [
      ...messages,
      {
        from: 'bot',
        text: 'The AI service has temporarily reached its usage limit. Please try again later.'
      }
    ]);

    return;
  }

  // Backend returned an error
  if (e.response) {
    setMsgs((messages) => [
      ...messages,
      {
        from: 'bot',
        text: 'The agent encountered a server error. Please try again shortly.'
      }
    ]);

    return;
  }

  // No response = actual network/connectivity problem
  setMsgs((messages) => [
    ...messages,
    {
      from: 'bot',
      text: 'Unable to reach the AI service. Please check your connection and try again.'
    }
  ]);
}
    finally {
      setLoading(false);
    }
  };

  // Floating launcher button — only relevant when NOT embedded.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg"
      >
        💬
      </button>
    );
  }

  const containerClass = dark
    ? `${embedded ? '' : 'fixed bottom-5 right-5 w-80'} bg-[#16181D] border border-white/10 rounded-lg shadow-2xl shadow-black/50 flex flex-col ${embedded ? 'h-[28rem]' : 'h-96'}`
    : embedded
    ? 'bg-white border rounded-lg shadow-xl flex flex-col h-[28rem]'
    : 'fixed bottom-5 right-5 w-80 bg-white border rounded-lg shadow-xl flex flex-col h-96';

  return (
    <div className={containerClass}>
      {/* HEADER — only shown as a closeable bar in floating mode */}
      <div
        className={`p-3 flex justify-between rounded-t-lg font-[Manrope,sans-serif] ${
          dark ? 'bg-[#1D2027] text-[#F3F1EA] border-b border-white/10' : 'bg-blue-600 text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          {dark && <span className="w-1.5 h-1.5 rounded-full bg-[#E3A63E]" />}
          Mak Agent
        </span>
        {!embedded && <button onClick={() => setOpen(false)}>✕</button>}
      </div>

      {/* MESSAGES */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-2 font-[Manrope,sans-serif] ${dark ? 'bg-[#0F1013]' : ''}`}>
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block p-2 rounded max-w-[85%] text-sm text-left ${
                dark
                  ? m.from === 'user'
                    ? 'bg-[#E3A63E] text-[#14151A]'
                    : 'bg-[#1D2027] text-[#F3F1EA] border border-white/10'
                  : m.from === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {m.from === 'bot' ? (
                <ReactMarkdown
                  components={{
                    // Default <p> has browser margins that look wrong in a small
                    // bubble — override every element ReactMarkdown might emit
                    // so spacing stays tight and consistent with the chat UI.
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={dark ? 'underline text-[#E3A63E]' : 'underline text-blue-600'}
                      >
                        {children}
                      </a>
                    )
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </span>
          </div>
        ))}

        {loading && (
          <div className="text-left">
            <span
              className={`inline-block p-2 rounded text-sm ${
                dark ? 'bg-[#1D2027] text-[#9AA0AC] border border-white/10' : 'bg-gray-100'
              }`}
            >
              Mak Agent is thinking...
            </span>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className={`p-2 flex gap-2 ${dark ? 'border-t border-white/10 bg-[#16181D]' : 'border-t'}`}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              send();
            }
          }}
          disabled={loading}
          className={
            dark
              ? 'flex-1 rounded p-2 bg-[#0F1013] border border-white/10 text-[#F3F1EA] placeholder-[#6B7280] focus:outline-none focus:border-[#E3A63E]'
              : 'flex-1 border rounded p-2'
          }
          placeholder="Ask about fees, registration, results..."
        />
        <button
          onClick={send}
          disabled={loading}
          className={
            dark
              ? 'px-3 rounded bg-[#E3A63E] text-[#14151A] font-medium disabled:opacity-40'
              : 'bg-blue-600 text-white px-3 rounded disabled:opacity-50'
          }
        >
          Send
        </button>
      </div>
    </div>
  );
}
