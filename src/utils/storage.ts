import { AttendanceRecord, LoadedFileMeta } from '../types/attendance';

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

/**
 * Saves records and file metadata to localStorage
 */
export function saveStoredAttendance(
  records: AttendanceRecord[],
  loadedFiles: LoadedFileMeta[]
): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    // Serialize LoadedFileMeta ensuring loadedAt is converted properly
    const filesToStore = loadedFiles.map((f) => ({
      ...f,
      loadedAt: f.loadedAt instanceof Date ? f.loadedAt.toISOString() : f.loadedAt,
    }));
    window.localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(filesToStore));
    window.localStorage.setItem(STORAGE_KEY_TIMESTAMP, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('Failed to save attendance data to localStorage', err);
    return false;
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

