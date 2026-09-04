export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const DB_NAME = 'training-constructor';
const STORE_NAME = 'key-value';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB недоступна'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не вдалося відкрити IndexedDB'));
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Помилка локального сховища'));
      transaction.onabort = () => reject(transaction.error || new Error('Запис у локальне сховище скасовано'));
    });
  } finally {
    database.close();
  }
}

export const storage = {
  async get(key) {
    if (globalThis.indexedDB) {
      const value = await withStore('readonly', (store) => store.get(key));
      if (value != null) return { key, value };
    }
    const legacy = localStorage.getItem(key);
    if (legacy === null) return null;
    if (globalThis.indexedDB) {
      await withStore('readwrite', (store) => store.put(legacy, key));
      localStorage.removeItem(key);
    }
    return { key, value: legacy };
  },
  async set(key, value) {
    if (globalThis.indexedDB) {
      await withStore('readwrite', (store) => store.put(value, key));
      localStorage.removeItem(key);
    } else localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    if (globalThis.indexedDB) await withStore('readwrite', (store) => store.delete(key));
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};
