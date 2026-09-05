import { Activity, Bot, Plug2, Receipt, Search, Sparkles, Command } from 'lucide-react';
import type { TabId } from '../types';
import { useStore } from '../lib/store';
import { cn } from '../lib/cn';

const TABS: { id: TabId; label: string; icon: React.ComponentType<any>; key: string }[] = [
  { id: 'chat', label: 'Chat', icon: Bot, key: '1' },
  { id: 'connections', label: 'Connections', icon: Plug2, key: '2' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Receipt, key: '3' },
  { id: 'recipes', label: 'Recipes', icon: Sparkles, key: '4' },
  { id: 'activity', label: 'Activity', icon: Activity, key: '5' },
];

export default function Sidebar() {
  const { tab, setTab, setPaletteOpen, globalQuery, setGlobalQuery, connections, subscriptions, recipes } = useStore();
  const counts: Record<TabId, number> = {
    chat: 0,
    connections: connections.length,
    subscriptions: subscriptions.filter((s) => s.active).length,
    recipes: recipes.filter((r) => r.enabled).length,
    activity: 0,
  };
  return (
    <aside className="flex w-full flex-col gap-4 lg:w-64 lg:flex-none">
      <div className="card flex items-center gap-3 p-4">
        <div className="relative h-10 w-10 flex-none">
          <div className="absolute inset-0.5 rounded-full border border-line" />
          <div className="absolute inset-[14px] rounded-full bg-signal shadow-[0_0_14px_#3df08a]" />
          <div className="absolute inset-0.5 animate-[spin_6s_linear_infinite] rounded-full">
            <div className="absolute left-1/2 top-[-3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-amber shadow-[0_0_10px_#ffb224]" />
          </div>
        </div>
        <div>
          <p className="font-mono text-sm font-bold tracking-widest text-ink">ASTRA CONTROL</p>
          <p className="font-mono text-[11px] text-dim">mission deck · v2</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          placeholder="Global search… ( / )"
          aria-label="Global search"
          className="input pl-9"
        />
      </div>

      <nav className="grid grid-cols-5 gap-1 lg:grid-cols-1" aria-label="Primary">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm transition-all lg:justify-start lg:px-3',
                active ? 'border-amber/50 bg-amber/10 text-amber' : 'border-transparent text-dim hover:border-line hover:bg-panel2 hover:text-ink'
              )}
              title={`${t.label} (press ${t.key})`}
            >
              <Icon size={17} />
              <span className="hidden lg:inline">{t.label}</span>
              {counts[t.id] > 0 && (
                <span className="ml-auto hidden rounded-full bg-panel2 px-2 py-0.5 font-mono text-[11px] text-dim lg:inline">{counts[t.id]}</span>
              )}
            </button>
          );
        })}
      </nav>

      <button onClick={() => setPaletteOpen(true)} className="btn-ghost w-full justify-between" title="Command palette (Ctrl/⌘+K)">
        <span className="flex items-center gap-2"><Command size={15} /> Command palette</span>
        <kbd className="rounded border border-line bg-void px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
      </button>

      <p className="hidden font-mono text-[11px] leading-relaxed text-faint lg:block">
        keys — 1–5 tabs · / search ·<br />⌘K palette · Esc close
      </p>
    </aside>
  );
}
