import { ArrowUpRight, CalendarClock, Plug2, Sparkles, Wallet } from 'lucide-react';
import { useStore } from '../lib/store';

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export default function StatsStrip() {
  const { connections, subscriptions, recipes, setTab } = useStore();

  const activeSubs = subscriptions.filter((s) => s.active);
  const monthly = activeSubs.reduce((sum, s) => sum + (s.cycle === 'monthly' ? s.cost : s.cost / 12), 0);

  const connsUp = connections.filter((c) => c.status === 'online').length;
  const recipesOn = recipes.filter((r) => r.enabled).length;

  const renewals = activeSubs
    .map((s) => ({ s, d: daysUntil(s.renewal) }))
    .sort((a, b) => a.d - b.d);
  const next = renewals[0];

  const stats = [
    {
      icon: Wallet,
      label: 'Monthly spend',
      value: `$${monthly.toFixed(2)}`,
      sub: `${activeSubs.length} active sub${activeSubs.length === 1 ? '' : 's'}`,
      accent: 'text-amber',
      tab: 'subscriptions' as const,
    },
    {
      icon: Plug2,
      label: 'Connections up',
      value: connections.length ? `${connsUp}/${connections.length}` : '—',
      sub: connections.length ? (connsUp === connections.length ? 'all healthy' : 'needs attention') : 'none added yet',
      accent: connections.length && connsUp === connections.length ? 'text-signal' : 'text-amber',
      tab: 'connections' as const,
    },
    {
      icon: Sparkles,
      label: 'Recipes on',
      value: `${recipesOn}/${recipes.length}`,
      sub: recipesOn ? 'automations armed' : 'all paused',
      accent: 'text-violet',
      tab: 'recipes' as const,
    },
    {
      icon: CalendarClock,
      label: 'Next renewal',
      value: next ? (next.d < 0 ? `${-next.d}d overdue` : next.d === 0 ? 'today' : `${next.d}d`) : '—',
      sub: next ? next.s.name.slice(0, 22) : 'no active subs',
      accent: next && next.d <= 7 ? 'text-rose' : 'text-signal',
      tab: 'subscriptions' as const,
    },
  ];

  return (
    <section aria-label="Live overview" className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.label}
            onClick={() => s.tab && setTab(s.tab)}
            className="card group flex items-center gap-3 p-3 text-left transition-colors hover:border-amber/40"
          >
            <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line bg-void ${s.accent}`}>
              <Icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-faint">{s.label}</span>
              <span className="block font-mono text-lg font-bold leading-tight text-ink">{s.value}</span>
              <span className="block truncate text-[11px] text-dim">{s.sub}</span>
            </span>
            <ArrowUpRight size={13} className="flex-none text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        );
      })}
    </section>
  );
}
