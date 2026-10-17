// Journal storage — IndexedDB via `idb`, with a graceful in-memory fallback.
// One entry per calendar day (keyed by local dateKey).
//
// Privacy: entries live ONLY on this device (IndexedDB or a JS Map). They are
// never sent over the network, and entry text is never written to the console.

import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { ToneKey } from '../config';
import { isValidDateKey } from '../utils/date';

export interface ToneScore {
  tone: ToneKey;
  score: number;
}

export interface Entry {
  id: string;
  dateKey: string; // YYYY-MM-DD, local time
  text: string;
  suggestedTones: ToneScore[];
  analysisMethod: 'lexicon';
  userTone: ToneKey | null;
  artSeed: number;
  artPalette: string;
  artVariant: number;
  soundscape: string;
  createdAt: number;
  updatedAt: number;
}

type Schema = {
  entries: {
    key: string;
    value: Entry;
    indexes: { 'by-date': string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
};

const DB_NAME = 'daydrop-db';
const DB_VERSION = 2;
const STORE = 'entries';
const META = 'meta';

let storageState: 'ok' | 'memory' = 'ok';
let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
const memoryStore = new Map<string, Entry>();
const memoryMeta = new Map<string, unknown>();

/** 'ok' when IndexedDB is backing storage, 'memory' when using the fallback Map. */
export function getStorageState(): 'ok' | 'memory' {
  return storageState;
}

/** True when the IndexedDB API exists in this environment. */
export function isIndexedDBUsable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function useMemoryFallback(): void {
  storageState = 'memory';
  dbPromise = null;
}

async function getDb(): Promise<IDBPDatabase<Schema> | null> {
  if (storageState === 'memory') return null;
  if (!isIndexedDBUsable()) {
    useMemoryFallback();
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('by-date', 'dateKey', { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: 'key' });
        }
      },
    }).catch(() => {
      // Private mode / blocked storage → fall back to memory, keep working.
      useMemoryFallback();
      return null as unknown as IDBPDatabase<Schema>;
    });
  }
  const db = await dbPromise;
  if (!db) {
    useMemoryFallback();
    return null;
  }
  return db;
}

function validateEntry(entry: Entry): void {
  if (!entry.id || typeof entry.id !== 'string') {
    throw new Error('Entry must have a non-empty id');
  }
  if (!isValidDateKey(entry.dateKey)) {
    throw new Error(`Invalid dateKey: ${entry.dateKey}`);
  }
}

export async function getEntry(dateKey: string): Promise<Entry | null> {
  const db = await getDb();
  if (!db) {
    for (const entry of memoryStore.values()) {
      if (entry.dateKey === dateKey) return entry;
    }
    return null;
  }
  const found = await db.getAllFromIndex(STORE, 'by-date', dateKey);
  return found[0] ?? null;
}

export async function saveEntry(entry: Entry): Promise<void> {
  validateEntry(entry);
  const db = await getDb();
  if (!db) {
    memoryStore.set(entry.id, entry);
    return;
  }
  await db.put(STORE, entry);
}

export async function deleteEntry(dateKey: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    for (const [id, entry] of memoryStore) {
      if (entry.dateKey === dateKey) memoryStore.delete(id);
    }
    return;
  }
  const existing = await getEntry(dateKey);
  if (existing) {
    await db.delete(STORE, existing.id);
  }
}

export async function listEntries(): Promise<Entry[]> {
  const db = await getDb();
  if (!db) {
    return [...memoryStore.values()].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }
  const all = await db.getAllFromIndex(STORE, 'by-date');
  return all.reverse(); // index is ascending → return dateKey descending
}

export async function entryCount(): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.size;
  return db.count(STORE);
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryStore.clear();
    return;
  }
  await db.clear(STORE);
  // Preferences (e.g. sound on/off) are kept — they are not journal data.
}

/**
 * Small key/value preferences (sound on/off, etc.). Backed by IndexedDB
 * with the same in-memory fallback as entries. Never stores journal text.
 */
export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  if (!db) {
    return (memoryMeta.has(key) ? memoryMeta.get(key) : fallback) as T;
  }
  const row = await db.get(META, key);
  return (row ? row.value : fallback) as T;
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryMeta.set(key, value);
    return;
  }
  await db.put(META, { key, value });
}
