import React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card p-4', className)}>{children}</div>;
}
export function Badge({ tone = 'dim', children }: { tone?: 'dim' | 'ok' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    dim: 'border-line text-dim',
    ok: 'border-signal/40 text-signal bg-signal/10',
    warn: 'border-amber/40 text-amber bg-amber/10',
    bad: 'border-rose/40 text-rose bg-rose/10',
    info: 'border-violet/40 text-violet bg-violet/10',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide', tones[tone])}>
      {children}
    </span>
  );
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-faint">{label}</span>
      {children}
    </label>
  );
}
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-6 text-center">
      <p className="text-sm text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  );
}
