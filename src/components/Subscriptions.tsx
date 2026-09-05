import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { totals } from '../lib/brain';
import { daysUntil, fmtMoney, uid } from '../lib/format';
import type { Subscription } from '../types';
import { Badge, Card, Empty, Field } from './ui';

interface SubForm { name: string; cost: string; currency: string; cycle: 'monthly' | 'yearly'; renewal: string; category: string; active: boolean }
const blank: SubForm = { name: '', cost: '', currency: 'USD', cycle: 'monthly', renewal: '', category: '', active: true };

export default function Subscriptions({ query }: { query: string }) {
  const { subscriptions, setSubscriptions, log } = useStore();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    const l = q ? subscriptions.filter((s) => `${s.name} ${s.category} ${s.cycle}`.toLowerCase().includes(q)) : subscriptions;
    return [...l].sort((a, b) => daysUntil(a.renewal) - daysUntil(b.renewal));
  }, [subscriptions, q]);

  const t = totals(subscriptions);
  const alerts = subscriptions.filter((s) => s.active && !Number.isNaN(daysUntil(s.renewal)) && daysUntil(s.renewal) <= 7);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.cost || !form.renewal) return;
    if (editing) {
      setSubscriptions((p) => p.map((s) => (s.id === editing ? { ...s, name: form.name.trim(), cost: Number(form.cost), currency: form.currency, cycle: form.cycle, renewal: form.renewal, category: form.category.trim() || 'General', active: form.active } : s)));
      log('subscription', `Updated ${form.name.trim()}.`);
      setEditing(null);
    } else {
      const s: Subscription = { id: uid('sub'), name: form.name.trim(), cost: Number(form.cost), currency: form.currency, cycle: form.cycle, renewal: form.renewal, category: form.category.trim() || 'General', active: form.active };
      setSubscriptions((p) => [s, ...p]);
      log('subscription', `Added ${s.name} — ${fmtMoney(s.cost, s.currency)}/${s.cycle}, renews ${s.renewal}.`);
    }
    setForm(blank);
  }

  function startEdit(s: Subscription) {
    setEditing(s.id);
    setForm({ name: s.name, cost: String(s.cost), currency: s.currency, cycle: s.cycle, renewal: s.renewal, category: s.category, active: s.active });
  }

  function toggle(id: string) {
    setSubscriptions((p) => p.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
    const s = subscriptions.find((x) => x.id === id);
    log('subscription', `${s?.active ? 'Paused' : 'Resumed'} ${s?.name}.`);
  }

  function remove(id: string) {
    const s = subscriptions.find((x) => x.id === id);
    setSubscriptions((p) => p.filter((x) => x.id !== id));
    log('subscription', `Removed ${s?.name ?? id}.`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="font-mono text-[11px] uppercase tracking-widest text-faint">Monthly burn</p><p className="mt-1 text-2xl font-bold text-amber">{fmtMoney(t.monthly, t.currency)}</p></Card>
        <Card><p className="font-mono text-[11px] uppercase tracking-widest text-faint">Yearly run-rate</p><p className="mt-1 text-2xl font-bold text-ink">{fmtMoney(t.yearly, t.currency)}</p></Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">Renewal alerts</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink"><BellRing size={20} className={alerts.length ? 'text-rose' : 'text-faint'} /> {alerts.length}</p>
          {alerts.length > 0 && <p className="mt-1 truncate font-mono text-[11px] text-rose">{alerts.map((a) => a.name).join(', ')} due ≤7d</p>}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-mono text-sm font-bold tracking-widest">{editing ? 'EDIT SUBSCRIPTION' : 'ADD SUBSCRIPTION'}</h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Figma" required /></Field>
          <Field label="Cost"><input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="15" required /></Field>
          <Field label="Currency"><input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} placeholder="USD" /></Field>
          <Field label="Cycle">
            <select className="input" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as 'monthly' | 'yearly' })}>
              <option value="monthly">monthly</option><option value="yearly">yearly</option>
            </select>
          </Field>
          <Field label="Renewal date"><input className="input" type="date" value={form.renewal} onChange={(e) => setForm({ ...form, renewal: e.target.value })} required /></Field>
          <Field label="Category"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Design" /></Field>
          <Field label="Status">
            <select className="input" value={form.active ? 'active' : 'paused'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}>
              <option value="active">active</option><option value="paused">paused</option>
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button className="btn-primary flex-1 justify-center" type="submit"><Plus size={15} /> {editing ? 'Save' : 'Add'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}><X size={15} /></button>}
          </div>
        </form>
      </Card>

      {list.length === 0 ? (
        <Empty title="No subscriptions here." hint="Add one above — totals and renewal alerts update live." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((s) => {
            const d = daysUntil(s.renewal);
            const urgent = s.active && !Number.isNaN(d) && d <= 7;
            const overdue = s.active && !Number.isNaN(d) && d < 0;
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={overdue ? '!border-rose/50' : urgent ? '!border-amber/50' : ''}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{s.name} <span className="font-mono text-[11px] text-faint">· {s.category}</span></p>
                      <p className="font-mono text-sm text-amber">{fmtMoney(s.cost, s.currency)}<span className="text-dim">/{s.cycle}</span></p>
                    </div>
                    <Badge tone={!s.active ? 'dim' : overdue ? 'bad' : urgent ? 'warn' : 'ok'}>
                      {!s.active ? 'paused' : overdue ? `overdue ${-d}d` : urgent ? (d <= 0 ? 'due now' : `${d}d left`) : `${d}d left`}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-dim">renews {s.renewal}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ghost !py-1.5 text-xs" onClick={() => toggle(s.id)}>{s.active ? 'Pause' : 'Resume'}</button>
                    <button className="btn-ghost !py-1.5 text-xs" onClick={() => startEdit(s)}><Pencil size={13} /> Edit</button>
                    <button className="btn-ghost !py-1.5 text-xs hover:!border-rose/50 hover:!text-rose" onClick={() => remove(s.id)}><Trash2 size={13} /></button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
