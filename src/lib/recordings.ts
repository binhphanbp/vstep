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
/**
 * Ask once for storage the browser will not reclaim on its own. Recordings live
 * only on the device — neither the JSON backup nor the cloud snapshot carries
 * audio — so eviction under storage pressure would lose them for good.
 */
let persistence: Promise<boolean> | null = null;
export function keepRecordings(): Promise<boolean> {
  persistence ??= (async () => {
    try {
      if (!navigator.storage?.persist) return false;
      return (
        (await navigator.storage.persisted?.()) || navigator.storage.persist()
      );
    } catch {
      return false;
    }
  })();
  return persistence;
}
export async function saveRecording(id: string, blob: Blob) {
  void keepRecordings();
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

export async function deleteRecording(id: string) {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("recordings", "readwrite");
      tx.objectStore("recordings").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Giao dịch xóa bản ghi đã bị hủy."));
    });
  } finally {
    database.close();
  }
}

/** Days after which a take is offered for deletion by the Settings panel. */
export const OLD_RECORDING_DAYS = 30;
/** What the recordings on this device add up to. */
export type RecordingUsage = { count: number; bytes: number; oldest: number };
/**
 * How much room the takes occupy.
 *
 * Nothing in the app could answer this before: recordings live only on the
 * device, they are the largest thing the app writes, and the only way to
 * remove one was to find its session in the history. A learner who records
 * every day deserves to see the number and to clear the old ones in one go.
 */
export async function recordingUsage(): Promise<RecordingUsage> {
  const database = await db();
  try {
    return await new Promise<RecordingUsage>((resolve, reject) => {
      const usage: RecordingUsage = { count: 0, bytes: 0, oldest: 0 };
      const req = database
        .transaction("recordings")
        .objectStore("recordings")
        .openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve(usage);
        const stored = cursor.value as StoredRecording | Blob;
        const blob = stored instanceof Blob ? stored : stored.blob;
        const savedAt = stored instanceof Blob ? 0 : stored.savedAt;
        usage.count += 1;
        usage.bytes += blob?.size ?? 0;
        if (!usage.oldest || (savedAt && savedAt < usage.oldest))
          usage.oldest = savedAt;
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    database.close();
  }
}
/**
 * Removes every take captured before `cutoff` and says how many went. Takes
 * stored before recordings carried a timestamp count as old, which is the
 * same reading `getRecording` gives them.
 */
export async function deleteRecordingsBefore(cutoff: number): Promise<number> {
  const database = await db();
  try {
    return await new Promise<number>((resolve, reject) => {
      let removed = 0;
      const tx = database.transaction("recordings", "readwrite");
      const req = tx.objectStore("recordings").openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const stored = cursor.value as StoredRecording | Blob;
        const savedAt = stored instanceof Blob ? 0 : stored.savedAt;
        if (savedAt < cutoff) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Giao dịch xóa bản ghi đã bị hủy."));
    });
  } finally {
    database.close();
  }
}
