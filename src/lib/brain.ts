import type { Connection, Recipe, Subscription } from '../types';
import { daysUntil, fmtMoney } from './format';

export interface BrainContext {
  connections: Connection[];
  subscriptions: Subscription[];
  recipes: Recipe[];
}

export const COMMANDS = [
  { cmd: '/help', desc: 'List all commands' },
  { cmd: '/connections', desc: 'Summarize connection statuses' },
  { cmd: '/subs', desc: 'List subscriptions + renewal alerts' },
  { cmd: '/total', desc: 'Show monthly / yearly spend totals' },
  { cmd: '/recipes', desc: 'List automations and their state' },
  { cmd: '/run <name>', desc: 'Hint: run a recipe from the Recipes tab' },
  { cmd: '/clear', desc: 'Clear chat history' },
  { cmd: '/export', desc: 'Download chat transcript as markdown' },
];

export function monthlyCost(s: Subscription): number {
  return s.cycle === 'monthly' ? s.cost : s.cost / 12;
}

export function totals(subs: Subscription[]): { monthly: number; yearly: number; currency: string } {
  const active = subs.filter((s) => s.active);
  const monthly = active.reduce((a, s) => a + monthlyCost(s), 0);
  const currency = active[0]?.currency ?? 'USD';
  return { monthly, yearly: monthly * 12, currency };
}

function renewalLine(s: Subscription): string {
  const d = daysUntil(s.renewal);
  if (Number.isNaN(d)) return `• ${s.name} — renewal date unclear (${s.renewal})`;
  if (d < 0) return `• ${s.name} — OVERDUE by ${-d}d (was ${s.renewal})`;
  if (d === 0) return `• ${s.name} — renews TODAY (${s.renewal})`;
  if (d <= 7) return `• ${s.name} — renews in ${d}d (${s.renewal}) ⚠`;
  return `• ${s.name} — renews in ${d}d (${s.renewal})`;
}

/** Pure local brain: deterministic answer from app state. Handles /commands + NL. */
export function localBrain(input: string, ctx: BrainContext): string {
  const text = input.trim();
  const low = text.toLowerCase();

  if (low === '/help' || low === 'help') {
    return 'Available commands:\n' + COMMANDS.map((c) => `• ${c.cmd} — ${c.desc}`).join('\n') +
      '\n\nTip: I can also answer plain questions like "what renews soon?", "total spend?", "are my connections up?". I try /api/chat first when configured, otherwise I answer locally from your app state.';
  }
  if (low === '/connections' || /connection.*(status|up|health|down)|are .* (up|online)/.test(low)) {
    if (!ctx.connections.length) return 'No connections yet. Add one under the Connections tab — give it a name, type and URL, then hit Test to get a real status check.';
    const rows = ctx.connections.map((c) => {
      const lat = c.latencyMs != null ? ` (${c.latencyMs}ms)` : '';
      const extra = c.note ? ` — ${c.note}` : '';
      return `• ${c.name} [${c.type}] → ${c.status.toUpperCase()}${lat}${extra}`;
    });
    const down = ctx.connections.filter((c) => c.status === 'offline').length;
    const head = down ? `${down} connection${down > 1 ? 's' : ''} offline. ` : 'All reachable connections look good. ';
    return head + '\n' + rows.join('\n');
  }
  if (low === '/subs' || /renew|subscription|expir/.test(low)) {
    if (!ctx.subscriptions.length) return 'No subscriptions tracked. Add one under Subscriptions.';
    const active = ctx.subscriptions.filter((s) => s.active);
    const rows = active.map(renewalLine);
    const urgent = active.filter((s) => { const d = daysUntil(s.renewal); return !Number.isNaN(d) && d <= 7; });
    const head = urgent.length
      ? `⚠ ${urgent.length} renewal${urgent.length > 1 ? 's' : ''} due within 7 days.`
      : 'No urgent renewals.';
    return `${head}\n${rows.join('\n')}`;
  }
  if (low === '/total' || /total|spend|cost|how much/.test(low)) {
    const t = totals(ctx.subscriptions);
    const n = ctx.subscriptions.filter((s) => s.active).length;
    return `Tracking ${n} active subscription${n === 1 ? '' : 's'}: ${fmtMoney(t.monthly, t.currency)}/mo (~${fmtMoney(t.yearly, t.currency)}/yr).`;
  }
  if (low === '/recipes' || /recipe|automat|routine|workflow/.test(low)) {
    if (!ctx.recipes.length) return 'No recipes yet. Create one under Recipes — chain actions like connection reports, subscription reports, or pings, then Run now.';
    return ctx.recipes.map((r) => `• ${r.name} — ${r.enabled ? 'enabled' : 'disabled'} (${r.actions.length} actions)${r.lastResult ? `\n  last: ${r.lastResult}` : ''}`).join('\n');
  }
  if (low.startsWith('/run')) {
    return 'To execute a recipe, open the Recipes tab and press Run — results are logged to Activity and stored on the recipe. (Recipes run against live app state.)';
  }
  if (low === '/clear') return '__CLEAR__';
  if (low === '/export') return '__EXPORT__';

  // --- natural language fallbacks ---
  if (/^(hi|hey|hello|yo)\b/.test(low)) {
    const t = totals(ctx.subscriptions);
    return `Hey. Mission deck is live: ${ctx.connections.length} connection${ctx.connections.length === 1 ? '' : 's'}, ${ctx.subscriptions.filter(s=>s.active).length} active subscriptions (${fmtMoney(t.monthly, t.currency)}/mo), ${ctx.recipes.filter(r=>r.enabled).length} enabled recipes. Ask "what renews soon?", "are my connections up?", or type /help.`;
  }
  if (/thank/.test(low)) return 'Anytime. Stay sharp out there.';
  if (/who are you|your name/.test(low)) return 'I’m Astra — the local brain of this mission deck. I read your connections, subscriptions and recipes live, and answer from real state. A remote /api/chat endpoint is used automatically when one is deployed.';
  if (/api\/chat|backend|server/.test(low)) return 'This build tries POST /api/chat first (same origin, {messages:[...]} → {reply}) and falls back to me, the local brain, when no endpoint answers. Fully static-safe for GitHub Pages.';

  // default: orient + offer
  const t = totals(ctx.subscriptions);
  return `I work from live deck state — right now: ${ctx.connections.length} connections, ${fmtMoney(t.monthly, t.currency)}/mo across ${ctx.subscriptions.filter(s=>s.active).length} active subs, ${ctx.recipes.length} recipes. Try:\n• "what renews soon?"\n• "total spend?"\n• "are my connections up?"\n• /help for commands`;
}

/**
 * /api/chat hook: tries a same-origin POST /api/chat, expects {reply: string}.
 * Returns null when unavailable so the caller falls back to localBrain.
 */
export async function remoteChat(messages: { role: string; text: string }[], timeoutMs = 9000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data && typeof data.reply === 'string' && data.reply.trim()) return data.reply;
      return null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
