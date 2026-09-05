export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  ts: number;
}

export type ConnStatus = 'unknown' | 'checking' | 'online' | 'degraded' | 'offline';

export interface Connection {
  id: string;
  name: string;
  type: 'REST API' | 'Webhook' | 'Database' | 'MQTT' | 'Other';
  url: string;
  hasKey: boolean;
  /** base64-obfuscated key (NOT real encryption — static site, no backend). */
  keyObf?: string;
  status: ConnStatus;
  latencyMs?: number;
  lastChecked?: number;
  note?: string;
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  cycle: 'monthly' | 'yearly';
  renewal: string; // ISO date yyyy-mm-dd
  category: string;
  active: boolean;
}

export type RecipeActionKind =
  | 'log'
  | 'connections-report'
  | 'subs-report'
  | 'ping-connection'
  | 'toggle-subscription';

export interface RecipeAction {
  kind: RecipeActionKind;
  /** free param: log text, connection id, or subscription id */
  param?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  actions: RecipeAction[];
  lastRun?: number;
  lastResult?: string;
}

export interface ActivityEntry {
  id: string;
  ts: number;
  kind: string;
  text: string;
}

export type TabId = 'chat' | 'connections' | 'subscriptions' | 'recipes' | 'activity';
