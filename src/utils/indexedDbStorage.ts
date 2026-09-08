import { AttendanceRecord, LoadedFileMeta } from '../types/attendance';

const DB_NAME = 'assistpro_database_v1';
const DB_VERSION = 1;

const STORE_RECORDS = 'attendance_records';
const STORE_FILES = 'loaded_files';
const STORE_META = 'metadata';

/**
 * Initializes and upgrades IndexedDB schema
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
        recordStore.createIndex('by_date', 'date', { unique: false });
        recordStore.createIndex('by_employee', 'employeeName', { unique: false });
        recordStore.createIndex('by_site', 'site', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores records and file metadata inside IndexedDB transactionally
 */
export async function saveIndexedDbAttendance(
  records: AttendanceRecord[],
  loadedFiles: LoadedFileMeta[],
  userId?: string
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_FILES, STORE_META], 'readwrite');
      const recordStore = tx.objectStore(STORE_RECORDS);
      const fileStore = tx.objectStore(STORE_FILES);
      const metaStore = tx.objectStore(STORE_META);

      // Clear previous records and repopulate
      recordStore.clear();
      fileStore.clear();

      for (const rec of records) {
        recordStore.put(userId ? { ...rec, _userId: userId } : rec);
      }

      for (const file of loadedFiles) {
        fileStore.put({
          ...file,
          _userId: userId,
          loadedAt: file.loadedAt instanceof Date ? file.loadedAt.toISOString() : file.loadedAt,
        });
      }

      const metaKey = userId ? `last_saved_${userId}` : 'last_saved';
      metaStore.put({ key: metaKey, value: new Date().toISOString() });

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error('Error saving to IndexedDB:', err);
    return false;
  }
}

/**
 * Loads records and file metadata from IndexedDB
 */
export async function loadIndexedDbAttendance(userId?: string): Promise<{
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  lastSaved: string | null;
} | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_FILES, STORE_META], 'readonly');
      const recordStore = tx.objectStore(STORE_RECORDS);
      const fileStore = tx.objectStore(STORE_FILES);
      const metaStore = tx.objectStore(STORE_META);

      const recordsReq = recordStore.getAll();
      const filesReq = fileStore.getAll();
      const metaKey = userId ? `last_saved_${userId}` : 'last_saved';
      const metaReq = metaStore.get(metaKey);

      tx.oncomplete = () => {
        let allRecords: (AttendanceRecord & { _userId?: string })[] = recordsReq.result || [];
        let rawFiles: (Record<string, unknown> & { _userId?: string })[] = filesReq.result || [];

        if (userId) {
          allRecords = allRecords.filter((r) => r._userId === userId || !r._userId);
          rawFiles = rawFiles.filter((f) => f._userId === userId || !f._userId);
        }

        const records: AttendanceRecord[] = allRecords.map(({ _userId, ...rest }) => rest as AttendanceRecord);
        const loadedFiles: LoadedFileMeta[] = rawFiles.map(({ _userId, ...f }) => ({
          ...f,
          loadedAt: f.loadedAt ? new Date(f.loadedAt as string) : new Date(),
        })) as LoadedFileMeta[];

        const lastSaved = metaReq.result ? metaReq.result.value : null;

        db.close();
        if (records.length === 0 && loadedFiles.length === 0) {
          resolve(null);
        } else {
          resolve({ records, loadedFiles, lastSaved });
        }
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error('Error loading from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears all IndexedDB stores
 */
export async function clearIndexedDbAttendance(userId?: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_FILES, STORE_META], 'readwrite');
      
      if (!userId) {
        tx.objectStore(STORE_RECORDS).clear();
        tx.objectStore(STORE_FILES).clear();
        tx.objectStore(STORE_META).clear();
      } else {
        const metaKey = `last_saved_${userId}`;
        tx.objectStore(STORE_META).delete(metaKey);
      }

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    return false;
  }
}
