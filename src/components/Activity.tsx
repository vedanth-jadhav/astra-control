import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmtDate } from '../lib/format';
import { Badge, Card, Empty } from './ui';

const KINDS = ['all', 'chat', 'connection', 'subscription', 'recipe', 'nav', 'system'] as const;

export default function Activity({ query }: { query: string }) {
  const { activity, clearActivity } = useStore();
  const [kind, setKind] = useState<(typeof KINDS)[number]>('all');
  const q = query.trim().toLowerCase();
  const list = activity.filter((a) => {
    if (kind !== 'all' && a.kind !== kind) return false;
    if (q && !`${a.kind} ${a.text}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-mono text-sm font-bold tracking-widest">ACTIVITY LOG</h2>
            <p className="font-mono text-[11px] text-dim">{activity.length} entries · newest first · persists locally</p>
          </div>
          <button className="btn-ghost !py-1.5 text-xs" onClick={clearActivity} disabled={!activity.length}>
            <Trash2 size={13} /> Clear
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by kind">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-all ${kind === k ? 'border-amber/50 bg-amber/10 text-amber' : 'border-line text-dim hover:text-ink'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </Card>

      {list.length === 0 ? (
        <Empty
          title={activity.length ? 'No activity matches this filter.' : 'No activity yet.'}
          hint={activity.length ? 'Pick a different kind or clear the search box.' : 'Send a chat message or test a connection to start the log.'}
        />
      ) : (
        <ol className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="card flex items-start gap-3 p-3">
              <span className="flex-none"><Badge tone={a.kind === 'recipe' ? 'info' : a.kind === 'connection' ? 'ok' : a.kind === 'subscription' ? 'warn' : 'dim'}>{a.kind}</Badge></span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-ink">{a.text}</p>
                <p className="mt-0.5 font-mono text-[11px] text-faint">{fmtDate(a.ts)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
