const DB_NAME = 'offline-doc-tracker';
const DB_VERSION = 1;
const STORE_NAME = 'app';

/**
 * Lightweight IndexedDB helpers - no external deps.
 */

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

// PUBLIC_INTERFACE
export async function idbAvailable() {
  try {
    const db = await openDB();
    db.close();
    return true;
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export async function idbGetAll() {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get('state');
    const result = await new Promise((resolve, reject) => {
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

// PUBLIC_INTERFACE
export async function idbPutAll(state) {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(state, 'state');
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// PUBLIC_INTERFACE
export async function idbClear() {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// PUBLIC_INTERFACE
export async function idbExportJSON() {
  return await idbGetAll();
}

// PUBLIC_INTERFACE
export async function idbImportJSON(json) {
  await idbPutAll(json);
}
