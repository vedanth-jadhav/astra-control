import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StoreProvider, useStore } from './lib/store';
import Sidebar from './components/Sidebar';
import StatsStrip from './components/StatsStrip';
import Chat from './components/Chat';
import Connections from './components/Connections';
import Subscriptions from './components/Subscriptions';
import Recipes from './components/Recipes';
import Activity from './components/Activity';
import CommandPalette from './components/CommandPalette';
import type { TabId } from './types';

function Shell() {
  const { tab, setTab, setPaletteOpen, setGlobalQuery } = useStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.card input[placeholder*="Global"]')?.focus?.();
        const el = document.querySelector<HTMLInputElement>('aside input');
        el?.focus();
        return;
      }
      const map: Record<string, TabId> = { 1: 'chat', 2: 'connections', 3: 'subscriptions', 4: 'recipes', 5: 'activity' };
      if (map[e.key]) setTab(map[e.key]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTab, setPaletteOpen, setGlobalQuery]);

  const { globalQuery } = useStore();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:p-6">
      <Sidebar />
      <main className="min-w-0 flex-1" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {tab === 'chat' && (
              <>
                <StatsStrip />
                <Chat />
              </>
            )}
            {tab === 'connections' && <Connections query={globalQuery} />}
            {tab === 'subscriptions' && <Subscriptions query={globalQuery} />}
            {tab === 'recipes' && <Recipes query={globalQuery} />}
            {tab === 'activity' && <Activity query={globalQuery} />}
          </motion.div>
        </AnimatePresence>
        <footer className="mt-4 font-mono text-[11px] text-faint">
          astra-control v3 · static build · state in localStorage · keys obfuscated, never leave your browser
        </footer>
      </main>
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
