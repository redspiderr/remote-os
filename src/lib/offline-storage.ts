'use client';

/**
 * Offline Storage — IndexedDB wrapper
 * Stores standup recordings locally, queues actions when offline,
 * and provides sync helpers.
 */

const DB_NAME = 'remote-os';
const DB_VERSION = 1;

const STORES = {
  recordings: 'recordings',
  queue: 'actionQueue',
  settings: 'settings',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot open IndexedDB outside browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.recordings)) {
        const store = db.createObjectStore(STORES.recordings, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.queue)) {
        const store = db.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };
  });
}

async function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Recordings ────────────────────────────────────────────────────

export interface LocalRecording {
  id?: number;
  blob: Blob;
  transcript?: string;
  durationSeconds: number;
  timestamp: number;
  synced: boolean;
}

export async function saveRecording(recording: Omit<LocalRecording, 'id' | 'timestamp'>): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORES.recordings, 'readwrite');
  const store = tx.objectStore(STORES.recordings);
  const record: LocalRecording = {
    ...recording,
    timestamp: Date.now(),
  };
  const req = store.add(record);
  return requestToPromise(req).then((id) => id as number);
}

export async function getRecordings(options?: { synced?: boolean; limit?: number }): Promise<LocalRecording[]> {
  const db = await openDB();
  const tx = db.transaction(STORES.recordings, 'readonly');
  const store = tx.objectStore(STORES.recordings);
  const items = await requestToPromise(store.getAll());
  let list = items as LocalRecording[];
  if (typeof options?.synced === 'boolean') {
    list = list.filter((i) => i.synced === options.synced);
  }
  if (options?.limit) {
    list = list.slice(-options.limit);
  }
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

export async function markRecordingSynced(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.recordings, 'readwrite');
  const store = tx.objectStore(STORES.recordings);
  const item = await requestToPromise(store.get(id));
  if (!item) return;
  (item as LocalRecording).synced = true;
  await requestToPromise(store.put(item));
}

export async function deleteRecording(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.recordings, 'readwrite');
  const store = tx.objectStore(STORES.recordings);
  await requestToPromise(store.delete(id));
}

// ─── Action Queue ────────────────────────────────────────────────────

export interface QueuedAction {
  id?: number;
  type: 'standup' | 'focus' | 'mood' | 'goal';
  payload: Record<string, unknown>;
  endpoint: string;
  method?: string;
  createdAt: number;
}

export async function enqueueAction(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORES.queue, 'readwrite');
  const store = tx.objectStore(STORES.queue);
  const record: QueuedAction = {
    ...action,
    createdAt: Date.now(),
  };
  return requestToPromise(store.add(record)) as Promise<number>;
}

export async function getQueue(): Promise<QueuedAction[]> {
  const db = await openDB();
  const tx = db.transaction(STORES.queue, 'readonly');
  const store = tx.objectStore(STORES.queue);
  const items = await requestToPromise(store.getAll());
  return (items as QueuedAction[]).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.queue, 'readwrite');
  const store = tx.objectStore(STORES.queue);
  await requestToPromise(store.delete(id));
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.queue, 'readwrite');
  const store = tx.objectStore(STORES.queue);
  await requestToPromise(store.clear());
}

export async function flushQueue(): Promise<{ success: number; failed: number }> {
  const items = await getQueue();
  let success = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok || res.status === 409) {
        if (item.id !== undefined) await removeFromQueue(item.id);
        success++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// ─── Connectivity ────────────────────────────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function registerSync(): Promise<void> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve();
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => {
        if ('sync' in reg) {
          (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync
            .register('sync-standups')
            .then(() => resolve())
            .catch(() => resolve());
        } else {
          resolve();
        }
      })
      .catch(() => resolve());
  });
}

export function onConnectionRestored(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    if (navigator.onLine) callback();
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

// ─── Settings ────────────────────────────────────────────────────────

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORES.settings, 'readonly');
  const store = tx.objectStore(STORES.settings);
  const result = await requestToPromise(store.get(key));
  if (!result) return undefined;
  return (result as { value: T }).value;
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.settings, 'readwrite');
  const store = tx.objectStore(STORES.settings);
  await requestToPromise(store.put({ key, value }));
}

export default {
  saveRecording,
  getRecordings,
  markRecordingSynced,
  deleteRecording,
  enqueueAction,
  getQueue,
  removeFromQueue,
  clearQueue,
  flushQueue,
  isOnline,
  registerSync,
  onConnectionRestored,
  getSetting,
  setSetting,
};
