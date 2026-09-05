import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ActivityEntry, ChatMessage, Connection, Recipe, Subscription, TabId } from '../types';
import { uid } from './format';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function save(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage full / private mode — ignore */
  }
}

interface AppState {
  tab: TabId;
  setTab: (t: TabId) => void;
  messages: ChatMessage[];
  pushMessage: (m: Omit<ChatMessage, 'id' | 'ts'>) => ChatMessage;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearChat: () => void;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  activity: ActivityEntry[];
  log: (kind: string, text: string) => void;
  clearActivity: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  globalQuery: string;
  setGlobalQuery: (q: string) => void;
}

const Ctx = createContext<AppState | null>(null);

const SEED_SUBS: Subscription[] = [
  { id: 'seed_openai', name: 'OpenAI API', cost: 20, currency: 'USD', cycle: 'monthly', renewal: isoPlus(21), category: 'AI', active: true },
  { id: 'seed_gh', name: 'GitHub Pro', cost: 4, currency: 'USD', cycle: 'monthly', renewal: isoPlus(9), category: 'Dev', active: true },
  { id: 'seed_domain', name: 'Domain renewal', cost: 14, currency: 'USD', cycle: 'yearly', renewal: isoPlus(5), category: 'Infra', active: true },
];
function isoPlus(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const SEED_RECIPES: Recipe[] = [
  {
    id: 'seed_morning',
    name: 'Morning briefing',
    description: 'Logs a status briefing: connections + subscription totals.',
    enabled: true,
    actions: [{ kind: 'connections-report' }, { kind: 'subs-report' }],
  },
];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<TabId>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => load('astra.chat', []));
  const [connections, setConnections] = useState<Connection[]>(() => load('astra.connections', []));
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const existing = load<Subscription[]>('astra.subs', []);
    return existing.length ? existing : SEED_SUBS;
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const existing = load<Recipe[]>('astra.recipes', []);
    return existing.length ? existing : SEED_RECIPES;
  });
  const [activity, setActivity] = useState<ActivityEntry[]>(() => load('astra.activity', []));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  useEffect(() => save('astra.chat', messages), [messages]);
  useEffect(() => save('astra.connections', connections), [connections]);
  useEffect(() => save('astra.subs', subscriptions), [subscriptions]);
  useEffect(() => save('astra.recipes', recipes), [recipes]);
  useEffect(() => save('astra.activity', activity.slice(0, 300)), [activity]);

  const log = useCallback((kind: string, text: string) => {
    setActivity((a) => [{ id: uid('act'), ts: Date.now(), kind, text }, ...a].slice(0, 300));
  }, []);

  const pushMessage = useCallback((m: Omit<ChatMessage, 'id' | 'ts'>) => {
    const full: ChatMessage = { ...m, id: uid('msg'), ts: Date.now() };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const clearChat = useCallback(() => setMessages([]), []);
  const clearActivity = useCallback(() => setActivity([]), []);
  const setTab = useCallback((t: TabId) => setTabState(t), []);

  const value = useMemo<AppState>(
    () => ({
      tab, setTab, messages, pushMessage, updateMessage, clearChat,
      connections, setConnections, subscriptions, setSubscriptions,
      recipes, setRecipes, activity, log, clearActivity,
      paletteOpen, setPaletteOpen, globalQuery, setGlobalQuery,
    }),
    [tab, setTab, messages, pushMessage, updateMessage, clearChat, connections, subscriptions, recipes, activity, log, clearActivity, paletteOpen, globalQuery]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
