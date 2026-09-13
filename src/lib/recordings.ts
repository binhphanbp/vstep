/** A take plus when it was captured, so an old one cannot be filed twice. */
export type StoredRecording = { blob: Blob; savedAt: number };
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let failed = false;
    const req = indexedDB.open("may-recordings", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("recordings");
    req.onsuccess = () => (failed ? req.result.close() : resolve(req.result));
    req.onerror = () => {
      failed = true;
      reject(req.error);
    };
    req.onblocked = () => {
      failed = true;
      reject(new Error("Kho bản ghi đang bị khóa bởi một tab khác."));
    };
  });
}
export async function saveRecording(id: string, blob: Blob) {
  const database = await db();
  const record: StoredRecording = { blob, savedAt: Date.now() };
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("recordings", "readwrite");
      tx.objectStore("recordings").put(record, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Giao dịch ghi âm đã bị hủy."));
    });
  } finally {
    database.close();
  }
}
export async function getRecording(
  id: string,
): Promise<StoredRecording | undefined> {
  const database = await db();
  try {
    const stored = await new Promise<unknown>((resolve, reject) => {
      const req = database
        .transaction("recordings")
        .objectStore("recordings")
        .get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!stored) return undefined;
    // Takes stored before recordings carried a timestamp are treated as old,
    // so they can still be played back but cannot pass for a fresh answer.
    return stored instanceof Blob
      ? { blob: stored, savedAt: 0 }
      : (stored as StoredRecording);
  } finally {
    database.close();
  }
}
