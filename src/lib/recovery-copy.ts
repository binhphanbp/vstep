import type { Recoverable } from "./recovery";

/**
 * A second copy of what an older tab would erase, kept in IndexedDB.
 *
 * Putting back from memory (`healStripped`) needs a tab of this build to be
 * open when the older tab saves. When none is, the notes would be gone from
 * the profile for good. This copy is what the next tab to open reads them
 * back from. It is in IndexedDB and not in localStorage so that it does not
 * take a share of the 5 MB the profile itself has to fit in.
 *
 * It is only a copy: nothing reads it unless the profile came back without
 * this build's stamp, and every failure here (a browser without IndexedDB, a
 * private window, a full disk) is swallowed, because the notebook works the
 * same without it.
 */
const DATABASE = "may-recovery-v1";
const STORE = "copy";
const KEY = "profile";

export type Copy = { savedAt: string; saved: Recoverable };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let gaveUp = false;
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      // A request that was given up on can still succeed later; the
      // connection it opens would then stay open and block the next upgrade.
      if (gaveUp) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      gaveUp = true;
      reject(new Error("blocked"));
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/**
 * The copy; null when there is none; undefined when the answer could not be
 * had. The difference matters: a copy that could not be read is still there,
 * and must not be treated as one that was never made.
 */
export async function readCopy(): Promise<Copy | null | undefined> {
  try {
    const value = (await transact("readonly", (store) => store.get(KEY))) as
      Partial<Copy> | undefined;
    if (value === undefined) return null;
    if (
      typeof value.savedAt !== "string" ||
      typeof value.saved !== "object" ||
      value.saved === null
    )
      // Something is there but it is not a copy: it will be written over once
      // the profile can be trusted again, like any other.
      return { savedAt: "", saved: {} };
    return { savedAt: value.savedAt, saved: value.saved };
  } catch {
    return undefined;
  }
}

/** True when the copy reached the disk. */
export async function writeCopy(copy: Copy): Promise<boolean> {
  try {
    await transact("readwrite", (store) => store.put(copy, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function clearCopy(): Promise<void> {
  try {
    await transact("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing to clear, or nowhere to clear it from.
  }
}
