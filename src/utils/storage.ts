import { AttendanceRecord, LoadedFileMeta } from '../types/attendance';
import {
  saveIndexedDbAttendance,
  loadIndexedDbAttendance,
  clearIndexedDbAttendance,
} from './indexedDbStorage';

const STORAGE_KEY_RECORDS = 'assistpro_attendance_records_v1';
const STORAGE_KEY_FILES = 'assistpro_attendance_files_v1';
const STORAGE_KEY_TIMESTAMP = 'assistpro_attendance_last_saved';

/**
 * Checks if localStorage is available and functioning
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export interface StorageSaveResult {
  success: boolean;
  error?: 'QUOTA_EXCEEDED' | 'STORAGE_UNAVAILABLE' | 'SERIALIZATION_FAILED' | 'UNKNOWN';
  message?: string;
}

/**
 * Saves records and file metadata to localStorage with quota overflow protection.
 */
export function saveStoredAttendance(
  records: AttendanceRecord[],
  loadedFiles: LoadedFileMeta[]
): boolean {
  const res = saveStoredAttendanceDetailed(records, loadedFiles);
  return res.success;
}

/**
 * Detailed save function providing granular error causes for monitoring and UI alerts
 */
export function saveStoredAttendanceDetailed(
  records: AttendanceRecord[],
  loadedFiles: LoadedFileMeta[]
): StorageSaveResult {
  if (!isStorageAvailable()) {
    return {
      success: false,
      error: 'STORAGE_UNAVAILABLE',
      message: 'El almacenamiento local (localStorage) no está disponible en este navegador.',
    };
  }

  try {
    const serializedRecords = JSON.stringify(records);
    const filesToStore = loadedFiles.map((f) => ({
      ...f,
      loadedAt: f.loadedAt instanceof Date ? f.loadedAt.toISOString() : f.loadedAt,
    }));
    const serializedFiles = JSON.stringify(filesToStore);

    window.localStorage.setItem(STORAGE_KEY_RECORDS, serializedRecords);
    window.localStorage.setItem(STORAGE_KEY_FILES, serializedFiles);
    window.localStorage.setItem(STORAGE_KEY_TIMESTAMP, new Date().toISOString());

    return { success: true };
  } catch (err: unknown) {
    console.error('Failed to save attendance data to localStorage', err);

    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.code === 1014 ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    if (isQuota) {
      return {
        success: false,
        error: 'QUOTA_EXCEEDED',
        message:
          'Se ha excedido el límite de almacenamiento del navegador (~5 MB). Exporta los datos o utiliza persistencia extendida.',
      };
    }

    return {
      success: false,
      error: 'UNKNOWN',
      message: err instanceof Error ? err.message : 'Error desconocido al guardar en almacenamiento.',
    };
  }
}

/**
 * Loads stored attendance records and file metadata from localStorage
 */
export function loadStoredAttendance(): {
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  lastSaved: string | null;
} | null {
  if (!isStorageAvailable()) return null;
  try {
    const rawRecords = window.localStorage.getItem(STORAGE_KEY_RECORDS);
    const rawFiles = window.localStorage.getItem(STORAGE_KEY_FILES);
    const lastSaved = window.localStorage.getItem(STORAGE_KEY_TIMESTAMP);

    if (!rawRecords) {
      return null;
    }

    const parsedRecords: AttendanceRecord[] = JSON.parse(rawRecords);
    const records = repairRecordsSite(parsedRecords);
    let loadedFiles: LoadedFileMeta[] = [];

    if (rawFiles) {
      const parsedFiles = JSON.parse(rawFiles);
      loadedFiles = parsedFiles.map((f: Record<string, unknown>) => ({
        ...f,
        loadedAt: f.loadedAt ? new Date(f.loadedAt as string) : new Date(),
      }));
    }

    return { records, loadedFiles, lastSaved };
  } catch (err) {
    console.error('Failed to parse attendance data from localStorage', err);
    return null;
  }
}

/**
 * Clears stored attendance data from localStorage
 */
export function clearStoredAttendance(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_RECORDS);
    window.localStorage.removeItem(STORAGE_KEY_FILES);
    window.localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch (err) {
    console.error('Failed to clear attendance localStorage', err);
  }
  // Also clear IndexedDB
  clearIndexedDbAttendance().catch((err) => {
    console.warn('Error clearing IndexedDB:', err);
  });
}

/**
 * Unified loader: Attempts to load from high-capacity IndexedDB.
 * If empty, checks localStorage, migrates existing data to IndexedDB, and returns it.
 */
export async function loadAndMigrateAttendance(): Promise<{
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  lastSaved: string | null;
} | null> {
  try {
    // 1. Check IndexedDB first
    const idbData = await loadIndexedDbAttendance();
    if (idbData && idbData.records && idbData.records.length > 0) {
      return {
        ...idbData,
        records: repairRecordsSite(idbData.records),
      };
    }

    // 2. Check localStorage fallback / legacy migration
    const localData = loadStoredAttendance();
    if (localData && localData.records && localData.records.length > 0) {
      // Migrate to IndexedDB in background
      saveIndexedDbAttendance(localData.records, localData.loadedFiles).catch((err) => {
        console.warn('Background migration to IndexedDB failed:', err);
      });
      return localData;
    }

    return null;
  } catch (err) {
    console.error('Error in loadAndMigrateAttendance:', err);
    return loadStoredAttendance();
  }
}

/**
 * Asynchronously persists records to IndexedDB without blocking the UI thread
 */
export async function persistToIndexedDb(
  records: AttendanceRecord[],
  loadedFiles: LoadedFileMeta[]
): Promise<boolean> {
  return saveIndexedDbAttendance(records, loadedFiles);
}

/**
 * Normalizes and repairs any site assignments in records that were erroneously
 * defaulted to UNEFA or General due to earlier parser defaults, based on sourceFile, id, notes, or department.
 */
export function repairRecordsSite(records: AttendanceRecord[]): AttendanceRecord[] {
  return records.map((r) => {
    const src = (r.sourceFile || '').toLowerCase();
    const id = (r.id || '').toLowerCase();
    const dept = (r.department || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    const currentSite = (r.site || '').trim();

    // Check if it belongs to Opeconca
    if (
      src.includes('opeconca') ||
      id.startsWith('ope_') ||
      dept.includes('opeconca') ||
      notes.includes('opeconca')
    ) {
      if (currentSite !== 'Oficina Opeconca') {
        return { ...r, site: 'Oficina Opeconca' };
      }
      return r;
    }

    // Check if it belongs to Nalys
    if (
      src.includes('nalys') ||
      id.startsWith('nal_') ||
      dept.includes('nalys') ||
      notes.includes('nalys')
    ) {
      if (currentSite !== 'Nalys') {
        return { ...r, site: 'Nalys' };
      }
      return r;
    }

    // Check if it belongs to UNEFA
    if (
      src.includes('unefa') ||
      id.startsWith('une_') ||
      dept.includes('unefa') ||
      notes.includes('unefa')
    ) {
      if (currentSite !== 'UNEFA') {
        return { ...r, site: 'UNEFA' };
      }
      return r;
    }

    // If site is empty or generic, try extracting from sourceFile
    if (!currentSite || currentSite === 'General' || currentSite === 'Sede Principal') {
      if (src.includes('opeconca')) return { ...r, site: 'Oficina Opeconca' };
      if (src.includes('nalys')) return { ...r, site: 'Nalys' };
      if (src.includes('unefa')) return { ...r, site: 'UNEFA' };
    }

    return r;
  });
}

