export type DraftData = {
  key?: string;
  toAddresses?: string; // JSON string representation
  ccAddresses?: string;
  bccAddresses?: string;
  replyTo?: string;
  subject?: string;
  bodyHtml?: string;
  attachments?: string;
};

const DB_NAME = "custom-mail-offline";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported on this platform"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveOfflineDraft(draft: Omit<DraftData, "key"> & { key?: string }): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    const key = draft.key || `pending_draft_${Date.now()}`;
    const draftWithKey = { ...draft, key };
    
    const request = store.put(draftWithKey, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(key);
  });
}

export async function getPendingDrafts(): Promise<DraftData[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function clearPendingDraft(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
