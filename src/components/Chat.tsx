import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Send, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { localBrain, remoteChat } from '../lib/brain';

function renderText(t: string): string[] {
  return t.split('\n');
}

export default function Chat() {
  const { messages, pushMessage, updateMessage, clearChat, connections, subscriptions, recipes, log, setTab } = useStore();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Scroll the message list only — never the window (landing must stay put).
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const el = bottomRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function streamReply(fullText: string, id: string) {
    // token-stream effect: reveal progressively
    const chunks = fullText.split(/(\s+)/);
    let shown = '';
    for (let i = 0; i < chunks.length; i++) {
      shown += chunks[i];
      updateMessage(id, { text: shown });
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 12));
    }
    updateMessage(id, { text: fullText });
  }

  async function send(raw?: string) {
    const text = (raw ?? draft).trim();
    if (!text || busy) return;
    setDraft('');
    pushMessage({ role: 'user', text });
    log('chat', `You: ${text.slice(0, 120)}`);

    if (text === '/clear') {
      clearChat();
      log('chat', 'Chat cleared.');
      return;
    }
    if (text === '/export') {
      exportTranscript();
      return;
    }

    setBusy(true);
    const placeholder = pushMessage({ role: 'assistant', text: '' });
    try {
      // 1) try remote /api/chat hook
      const history = [...messages, { role: 'user' as const, text }].slice(-20).map((m) => ({ role: m.role, text: m.text }));
      const remote = await remoteChat(history);
      if (remote) {
        await streamReply(remote, placeholder.id);
        log('chat', `Astra (remote): ${remote.slice(0, 120)}`);
      } else {
        const answer = localBrain(text, { connections, subscriptions, recipes });
        if (answer === '__CLEAR__') {
          clearChat();
        } else if (answer === '__EXPORT__') {
          exportTranscript();
          updateMessage(placeholder.id, { text: 'Transcript downloaded as markdown.' });
        } else {
          await streamReply(answer, placeholder.id);
        }
        log('chat', `Astra (local): ${answer.slice(0, 120)}`);
      }
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function exportTranscript() {
    const md = messages.map((m) => `**${m.role}** (${new Date(m.ts).toLocaleString()}):\n${m.text}`).join('\n\n---\n\n');
    const blob = new Blob([`# Astra Control — chat transcript\n\n${md}\n`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'astra-chat.md';
    a.click();
    URL.revokeObjectURL(a.href);
    log('chat', 'Transcript exported.');
  }

  return (
    <div className="card flex h-[70vh] min-h-[480px] flex-col overflow-hidden lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-2 w-2 flex-none rounded-full bg-signal shadow-[0_0_8px_#3df08a]" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-mono text-sm font-bold tracking-widest text-ink">ASTRA CHAT</h2>
            <p className="truncate font-mono text-[11px] text-dim">local brain · streams · persists · /api/chat ready</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !px-2.5 !py-1.5" onClick={exportTranscript} title="Export transcript (.md)"><Download size={15} /></button>
          <button className="btn-ghost !px-2.5 !py-1.5" onClick={() => { clearChat(); log('chat', 'Chat cleared.'); }} title="Clear history"><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-label="Chat history" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-xl border border-line bg-panel2/60 px-4 py-3.5">
            <p className="text-sm text-ink"><span className="font-mono text-xs text-signal">Astra</span> · standing by. Ask me anything:</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['what renews soon?', 'total spend?', 'are my connections up?', '/help'].map((s) => (
                <button key={s} onClick={() => send(s)} className="btn-ghost !px-2.5 !py-1 font-mono text-xs">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-amber px-3.5 py-2.5 text-sm text-black' : 'mr-auto max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink'}
          >
            {m.role === 'assistant' && <p className="mb-1 font-mono text-[11px] text-signal">Astra</p>}
            <div className="prose-chat whitespace-pre-wrap">
              {renderText(m.text).map((line, i) => (
                <p key={i}>{line || '\u00a0'}{i === renderText(m.text).length - 1 && busy && m.role === 'assistant' && !m.text ? '' : ''}</p>
              ))}
              {busy && m.role === 'assistant' && m.id === messages[messages.length - 1]?.id && <span className="stream-caret" />}
            </div>
            <p className={m.role === 'user' ? 'mt-1 font-mono text-[10px] text-black/60' : 'mt-1 font-mono text-[10px] text-faint'}>
              {new Date(m.ts).toLocaleTimeString()}
            </p>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Ask anything… try "what renews soon?" or /help'
          aria-label="Chat input"
          className="input"
          disabled={busy}
          data-chat-input
        />
        <button type="submit" className="btn-primary" disabled={busy || !draft.trim()} aria-label="Send">
          <Send size={15} /> <span className="hidden sm:inline">Send</span>
        </button>
      </form>
      <p className="border-t border-line px-4 py-1.5 font-mono text-[10px] text-faint">
        history persists in localStorage ·{' '}
        <button className="underline hover:text-dim" onClick={() => setTab('connections')}>manage connections</button>
      </p>
    </div>
  );
}
