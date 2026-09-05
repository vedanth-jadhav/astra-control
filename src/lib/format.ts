export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtMoney(n: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function daysUntil(isoDate: string, now = Date.now()): number {
  const t = new Date(isoDate + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return NaN;
  return Math.ceil((t - now) / 86400000);
}

/** Display-masked secret: show last 4 chars only. */
export function maskSecret(obf?: string): string {
  if (!obf) return '—';
  try {
    const raw = atob(obf);
    if (raw.length <= 4) return '••••';
    return `••••••••${raw.slice(-4)}`;
  } catch {
    return '••••';
  }
}

export function obfuscate(s: string): string {
  return btoa(s);
}

export function deobfuscate(obf?: string): string {
  if (!obf) return '';
  try {
    return atob(obf);
  } catch {
    return '';
  }
}
