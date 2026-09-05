import type { Connection, Recipe, Subscription } from '../types';
import { checkConnection } from './connections';
import { daysUntil, fmtMoney } from './format';
import { monthlyCost } from './brain';

export interface RunResult {
  ok: boolean;
  summary: string;
  lines: string[];
}

/** Execute a recipe's actions against live state. Returns lines for the log. */
export async function runRecipe(
  recipe: Recipe,
  ctx: {
    connections: Connection[];
    subscriptions: Subscription[];
    setConnections: (f: (prev: Connection[]) => Connection[]) => void;
    setSubscriptions: (f: (prev: Subscription[]) => Subscription[]) => void;
  }
): Promise<RunResult> {
  const lines: string[] = [];
  for (const a of recipe.actions) {
    switch (a.kind) {
      case 'log':
        lines.push(a.param || '(empty note)');
        break;
      case 'connections-report': {
        if (!ctx.connections.length) { lines.push('Connections report: none configured.'); break; }
        const results = await Promise.all(ctx.connections.map((c) => checkConnection(c)));
        ctx.setConnections((prev) => prev.map((c, i) => ({ ...c, ...results[i] })));
        const up = results.filter((r) => r.status === 'online').length;
        lines.push(`Connections report: ${up}/${results.length} online.`);
        ctx.connections.forEach((c, i) => lines.push(`  • ${c.name}: ${results[i].status?.toUpperCase()}${results[i].latencyMs != null ? ` (${results[i].latencyMs}ms)` : ''}`));
        break;
      }
      case 'subs-report': {
        const active = ctx.subscriptions.filter((s) => s.active);
        const m = active.reduce((x, s) => x + monthlyCost(s), 0);
        const cur = active[0]?.currency ?? 'USD';
        lines.push(`Subscriptions report: ${active.length} active, ${fmtMoney(m, cur)}/mo.`);
        active.forEach((s) => {
          const d = daysUntil(s.renewal);
          lines.push(`  • ${s.name}: ${fmtMoney(s.cost, s.currency)}/${s.cycle}, renews ${s.renewal}${!Number.isNaN(d) && d <= 7 ? ' ⚠ SOON' : ''}`);
        });
        break;
      }
      case 'ping-connection': {
        const conn = ctx.connections.find((c) => c.id === a.param);
        if (!conn) { lines.push(`Ping: connection not found (removed?).`); break; }
        const r = await checkConnection(conn);
        ctx.setConnections((prev) => prev.map((c) => (c.id === conn.id ? { ...c, ...r } : c)));
        lines.push(`Ping ${conn.name}: ${r.status?.toUpperCase()}${r.latencyMs != null ? ` in ${r.latencyMs}ms` : ''}${r.note ? ` — ${r.note}` : ''}`);
        break;
      }
      case 'toggle-subscription': {
        const sub = ctx.subscriptions.find((s) => s.id === a.param || s.name.toLowerCase() === (a.param || '').toLowerCase());
        if (!sub) { lines.push(`Toggle: subscription "${a.param}" not found.`); break; }
        ctx.setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, active: !s.active } : s)));
        lines.push(`Toggled ${sub.name} → ${sub.active ? 'paused' : 'active'}.`);
        break;
      }
      default:
        lines.push(`Unknown action: ${(a as { kind: string }).kind}`);
    }
  }
  const ok = !lines.some((l) => /not found|unknown/i.test(l));
  return { ok, lines, summary: lines[0] ?? 'done' };
}
