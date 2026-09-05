import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Plus, Trash2, Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { checkConnection } from '../lib/connections';
import { maskSecret, obfuscate, uid } from '../lib/format';
import type { Connection, ConnStatus } from '../types';
import { Badge, Card, Empty, Field } from './ui';

const STATUS_TONE: Record<ConnStatus, 'dim' | 'ok' | 'warn' | 'bad' | 'info'> = {
  unknown: 'dim', checking: 'info', online: 'ok', degraded: 'warn', offline: 'bad',
};

export default function Connections({ query }: { query: string }) {
  const { connections, setConnections, log } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<Connection['type']>('REST API');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testingAll, setTestingAll] = useState(false);

  const q = query.trim().toLowerCase();
  const list = q ? connections.filter((c) => `${c.name} ${c.type} ${c.url} ${c.status}`.toLowerCase().includes(q)) : connections;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const conn: Connection = {
      id: uid('conn'), name: name.trim(), type, url: url.trim(),
      hasKey: !!apiKey.trim(), keyObf: apiKey.trim() ? obfuscate(apiKey.trim()) : undefined,
      status: 'unknown',
    };
    setConnections((p) => [conn, ...p]);
    log('connection', `Added ${conn.name} (${conn.type}) → ${conn.url}`);
    setName(''); setUrl(''); setApiKey('');
    void testOne(conn.id);
  }

  async function testOne(id: string) {
    setConnections((p) => p.map((c) => (c.id === id ? { ...c, status: 'checking' as ConnStatus } : c)));
    const conn = connections.find((c) => c.id === id);
    // read fresh from storage-state via functional lookup
    let current: Connection | undefined;
    setConnections((p) => { current = p.find((c) => c.id === id); return p; });
    const target = current ?? conn;
    if (!target) return;
    const patch = await checkConnection(target);
    setConnections((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    log('connection', `Test ${target.name}: ${String(patch.status).toUpperCase()}${patch.latencyMs != null ? ` (${patch.latencyMs}ms)` : ''}${patch.note ? ` — ${patch.note}` : ''}`);
  }

  async function testAll() {
    if (!connections.length || testingAll) return;
    setTestingAll(true);
    log('connection', `Testing all ${connections.length} connections…`);
    for (const c of connections) {
      await testOne(c.id);
    }
    setTestingAll(false);
  }

  function remove(id: string) {
    const c = connections.find((x) => x.id === id);
    setConnections((p) => p.filter((x) => x.id !== id));
    log('connection', `Removed ${c?.name ?? id}.`);
  }

  const online = connections.filter((c) => c.status === 'online').length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-mono text-sm font-bold tracking-widest">CONNECTIONS</h2>
            <p className="font-mono text-[11px] text-dim">{connections.length} total · {online} online · keys obfuscated in localStorage</p>
          </div>
          <button className="btn-ghost" onClick={testAll} disabled={testingAll || !connections.length}>
            <FlaskConical size={15} /> {testingAll ? 'Testing…' : 'Test all'}
          </button>
        </div>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prod API" required /></Field>
          <Field label="Type">
            <select className="input" value={type} onChange={(e) => setType(e.target.value as Connection['type'])}>
              {['REST API', 'Webhook', 'Database', 'MQTT', 'Other'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="URL / endpoint"><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/health" required /></Field>
          <Field label="API key (optional)"><input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off" /></Field>
          <div className="flex items-end"><button className="btn-primary w-full justify-center" type="submit"><Plus size={15} /> Add</button></div>
        </form>
      </Card>

      {list.length === 0 ? (
        <Empty title={connections.length ? `No connections match "${query}".` : 'No connections yet.'} hint="Add your first endpoint above — it gets a real live status check." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{c.name}</p>
                    <p className="truncate font-mono text-[11px] text-dim">{c.type} · {c.url}</p>
                  </div>
                  <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                </div>
                <div className="mt-2 font-mono text-[11px] text-dim">
                  <p>key: {c.hasKey ? maskSecret(c.keyObf) : 'none'}</p>
                  <p>latency: {c.latencyMs != null ? `${c.latencyMs}ms` : '—'} · checked: {c.lastChecked ? new Date(c.lastChecked).toLocaleString() : 'never'}</p>
                  {c.note && <p className="mt-1 break-words text-faint">{c.note}</p>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !py-1.5 text-xs" onClick={() => testOne(c.id)} disabled={c.status === 'checking'}>
                    <Zap size={13} /> {c.status === 'checking' ? 'Checking…' : 'Test'}
                  </button>
                  <button className="btn-ghost !py-1.5 text-xs hover:!border-rose/50 hover:!text-rose" onClick={() => remove(c.id)}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
