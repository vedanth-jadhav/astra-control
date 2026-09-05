import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Plug2, Receipt, Sparkles, Activity, Trash2, Play, Plus, Terminal } from 'lucide-react';
import { useStore } from '../lib/store';
import type { TabId } from '../types';

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setTab, clearChat, log, recipes, setRecipes, setGlobalQuery, tab } = useStore();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ(''); setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const items = useMemo(() => {
    const go = (t: TabId, label: string, icon: typeof Bot) => ({
      label, hint: 'Go to tab', icon, run: () => { setTab(t); log('nav', `Jumped to ${label}.`); },
    });
    const all = [
      go('chat', 'Go to Chat', Bot),
      go('connections', 'Go to Connections', Plug2),
      go('subscriptions', 'Go to Subscriptions', Receipt),
      go('recipes', 'Go to Recipes', Sparkles),
      go('activity', 'Go to Activity', Activity),
      { label: 'Focus chat input', hint: 'Chat', icon: Terminal, run: () => { setTab('chat'); setTimeout(() => document.querySelector<HTMLInputElement>('[data-chat-input]')?.focus(), 60); } },
      { label: 'Clear chat history', hint: 'Chat', icon: Trash2, run: () => { clearChat(); log('chat', 'Chat cleared via palette.'); } },
      { label: 'Clear global search', hint: 'Search', icon: Trash2, run: () => setGlobalQuery('') },
      ...recipes.filter((r) => r.enabled).map((r) => ({
        label: `Enable/disable recipe: ${r.name}`, hint: 'Recipe', icon: Play,
        run: () => { setRecipes((p) => p.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x))); log('recipe', `Toggled "${r.name}" via palette.`); },
      })),
      { label: 'Add connection…', hint: 'Connections', icon: Plus, run: () => setTab('connections') },
    ];
    const needle = q.trim().toLowerCase();
    return (needle ? all.filter((i) => i.label.toLowerCase().includes(needle)) : all).slice(0, 12);
  }, [q, recipes, setTab, clearChat, log, setRecipes, setGlobalQuery]);

  useEffect(() => setIdx(0), [q]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[idx]?.run(); setPaletteOpen(false); }
    else if (e.key === 'Escape') { setPaletteOpen(false); }
  }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
          onClick={() => setPaletteOpen(false)}
          role="dialog" aria-modal="true" aria-label="Command palette"
        >
          <motion.div
            initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: -8 }}
            className="card w-full max-w-lg overflow-hidden !p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a command… (↑↓ navigate, ⏎ run, Esc close)"
              className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none placeholder:text-faint"
              aria-label="Command input"
            />
            <ul className="max-h-72 overflow-y-auto p-1.5" role="listbox" aria-label="Commands">
              {items.length === 0 && <li className="px-3 py-4 text-center text-sm text-dim">No matching commands. Try a different search.</li>}
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li key={it.label}>
                    <button
                      onClick={() => { it.run(); setPaletteOpen(false); }}
                      onMouseEnter={() => setIdx(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${i === idx ? 'bg-amber/10 text-amber' : 'text-ink'}`}
                      role="option" aria-selected={i === idx}
                    >
                      <Icon size={15} className={i === idx ? 'text-amber' : 'text-dim'} />
                      <span className="flex-1">{it.label}</span>
                      <span className="font-mono text-[10px] text-faint">{it.hint}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-4 py-2 font-mono text-[10px] text-faint">current tab: {tab} · ⌘K toggles</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
