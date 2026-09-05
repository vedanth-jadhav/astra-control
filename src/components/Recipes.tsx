import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { runRecipe } from '../lib/recipes';
import { uid } from '../lib/format';
import type { Recipe, RecipeAction, RecipeActionKind } from '../types';
import { Badge, Card, Empty, Field } from './ui';

const ACTION_LABELS: Record<RecipeActionKind, string> = {
  log: 'Log a note',
  'connections-report': 'Connections status report (live checks)',
  'subs-report': 'Subscriptions spend report',
  'ping-connection': 'Ping one connection',
  'toggle-subscription': 'Toggle a subscription active/paused',
};

export default function Recipes({ query }: { query: string }) {
  const { recipes, setRecipes, connections, subscriptions, setConnections, setSubscriptions, log } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [actions, setActions] = useState<RecipeAction[]>([{ kind: 'log', param: 'Morning check complete.' }]);
  const [running, setRunning] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const list = q ? recipes.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(q)) : recipes;

  function addAction() {
    setActions((a) => [...a, { kind: 'log', param: '' }]);
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !actions.length) return;
    const r: Recipe = { id: uid('rec'), name: name.trim(), description: desc.trim() || 'Custom automation.', enabled: true, actions: actions.filter((a) => a.kind) };
    setRecipes((p) => [r, ...p]);
    log('recipe', `Created recipe "${r.name}" (${r.actions.length} actions).`);
    setName(''); setDesc(''); setActions([{ kind: 'log', param: '' }]);
  }

  function toggle(id: string) {
    setRecipes((p) => p.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    const r = recipes.find((x) => x.id === id);
    log('recipe', `${r?.enabled ? 'Disabled' : 'Enabled'} recipe "${r?.name}".`);
  }

  function remove(id: string) {
    const r = recipes.find((x) => x.id === id);
    setRecipes((p) => p.filter((x) => x.id !== id));
    log('recipe', `Deleted recipe "${r?.name ?? id}".`);
  }

  async function runNow(id: string) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe || running) return;
    if (!recipe.enabled) {
      log('recipe', `Run blocked: "${recipe.name}" is disabled.`);
      return;
    }
    setRunning(id);
    log('recipe', `Running "${recipe.name}"…`);
    try {
      const res = await runRecipe(recipe, { connections, subscriptions, setConnections, setSubscriptions });
      const summary = res.lines.join(' | ').slice(0, 220);
      setRecipes((p) => p.map((r) => (r.id === id ? { ...r, lastRun: Date.now(), lastResult: summary } : r)));
      log('recipe', `"${recipe.name}" ${res.ok ? 'done' : 'finished with warnings'}: ${summary}`);
      setOpenLog(id);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-mono text-sm font-bold tracking-widest">NEW RECIPE</h2>
        <form onSubmit={create} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning briefing" required /></Field>
            <Field label="Description"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does it do?" /></Field>
          </div>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-void p-2.5 sm:flex-row">
                <select className="input sm:max-w-[260px]" value={a.kind} onChange={(e) => setActions((p) => p.map((x, j) => (j === i ? { ...x, kind: e.target.value as RecipeActionKind } : x)))}>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {(a.kind === 'log') && (
                  <input className="input" value={a.param ?? ''} onChange={(e) => setActions((p) => p.map((x, j) => (j === i ? { ...x, param: e.target.value } : x)))} placeholder="Note to log…" />
                )}
                {a.kind === 'ping-connection' && (
                  <select className="input" value={a.param ?? ''} onChange={(e) => setActions((p) => p.map((x, j) => (j === i ? { ...x, param: e.target.value } : x)))}>
                    <option value="">— pick connection —</option>
                    {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {a.kind === 'toggle-subscription' && (
                  <select className="input" value={a.param ?? ''} onChange={(e) => setActions((p) => p.map((x, j) => (j === i ? { ...x, param: e.target.value } : x)))}>
                    <option value="">— pick subscription —</option>
                    {subscriptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <button type="button" className="btn-ghost !px-2.5" onClick={() => setActions((p) => p.filter((_, j) => j !== i))} aria-label="Remove action"><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={addAction}><Plus size={15} /> Add action</button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}><Plus size={15} /> Create recipe</button>
          </div>
        </form>
      </Card>

      {list.length === 0 ? (
        <Empty title="No recipes here." hint="Chain actions above — reports run against live app state and log to Activity." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{r.name}</p>
                    <p className="text-xs text-dim">{r.description}</p>
                  </div>
                  <Badge tone={r.enabled ? 'ok' : 'dim'}>{r.enabled ? 'enabled' : 'disabled'}</Badge>
                </div>
                <p className="mt-2 font-mono text-[11px] text-faint">{r.actions.map((a) => ACTION_LABELS[a.kind]).join(' → ')}</p>
                {r.lastRun && <p className="mt-1 font-mono text-[11px] text-dim">last run {new Date(r.lastRun).toLocaleString()}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary !py-1.5 text-xs" onClick={() => runNow(r.id)} disabled={running === r.id || !r.enabled}>
                    <Play size={13} /> {running === r.id ? 'Running…' : 'Run now'}
                  </button>
                  <button className="btn-ghost !py-1.5 text-xs" onClick={() => toggle(r.id)}>{r.enabled ? 'Disable' : 'Enable'}</button>
                  {r.lastResult && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setOpenLog(openLog === r.id ? null : r.id)}>{openLog === r.id ? 'Hide result' : 'View result'}</button>}
                  <button className="btn-ghost !py-1.5 text-xs hover:!border-rose/50 hover:!text-rose" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
                </div>
                <AnimatePresence>
                  {openLog === r.id && r.lastResult && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden whitespace-pre-wrap rounded-lg bg-void p-2.5 font-mono text-[11px] text-signal">
                      {r.lastResult}
                    </motion.p>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
