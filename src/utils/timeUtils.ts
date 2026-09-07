/**
 * Utility functions for time parsing, conversions, and business hour calculations.
 */

// Schedule parameters
export const SCHEDULED_DAILY_HOURS = 8.0;
export const OFFICIAL_START_TIME = '08:00:00';
export const OFFICIAL_END_TIME = '17:30:00';
export const OFFICIAL_GROSS_HOURS = 9.5; // 08:00 AM to 05:30 PM
export const LUNCH_DEDUCTION_HOURS = 1.5; // 1 hr 30 mins

/**
 * Parses numeric UNEFA time format (e.g., 80512 -> "08:05:12", 173000 -> "17:30:00", 800 -> "08:00:00", 1730 -> "17:30:00")
 * or general time string / number.
 */
export function parseUnefaTime(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toTimeString().split(' ')[0];
  }

  // If it's an Excel time fraction (0 <= val < 1)
  if (typeof val === 'number') {
    if (val > 0 && val < 1) {
      return excelTimeFractionToString(val);
    }
  }

  const strVal = String(val).trim();
  if (!strVal) return '';

  // Check if it's purely digits (like 8, 800, 830, 1730, 80512, 173000)
  if (/^\d{1,6}$/.test(strVal)) {
    if (strVal.length === 6) {
      // HHMMSS
      const hh = strVal.slice(0, 2);
      const mm = strVal.slice(2, 4);
      const ss = strVal.slice(4, 6);
      return `${hh}:${mm}:${ss}`;
    }
    if (strVal.length === 5) {
      // HMMSS e.g. 80512 -> 08:05:12
      const hh = `0${strVal.slice(0, 1)}`;
      const mm = strVal.slice(1, 3);
      const ss = strVal.slice(3, 5);
      return `${hh}:${mm}:${ss}`;
    }
    if (strVal.length === 4) {
      // HHMM e.g. 0830 or 1730 -> 17:30:00
      const hh = strVal.slice(0, 2);
      const mm = strVal.slice(2, 4);
      return `${hh}:${mm}:00`;
    }
    if (strVal.length === 3) {
      // HMM e.g. 830 -> 08:30:00
      const hh = `0${strVal.slice(0, 1)}`;
      const mm = strVal.slice(1, 3);
      return `${hh}:${mm}:00`;
    }
    if (strVal.length <= 2) {
      // H or HH e.g. 8 -> 08:00:00
      const hh = strVal.padStart(2, '0');
      return `${hh}:00:00`;
    }
  }

  return normalizeTimeString(strVal);
}

/**
 * Converts Excel decimal day fraction (e.g. 0.333333 for 08:00) to HH:MM:SS
 */
export function excelTimeFractionToString(fraction: number): string {
  const totalSeconds = Math.round(fraction * 86400);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Normalizes general time string to HH:MM:SS format
 */
export function normalizeTimeString(val: unknown): string {
  if (val === null || val === undefined) return '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toTimeString().split(' ')[0];
  }

  if (typeof val === 'number') {
    if (val > 0 && val < 1) {
      return excelTimeFractionToString(val);
    }
    return parseUnefaTime(val);
  }

  const str = String(val).trim();
  if (!str) return '';

  // If full date time string like "2024-03-01 08:15:30" or "01/03/2024 08:15:30"
  if (str.includes(' ') && (str.includes('/') || str.includes('-'))) {
    const parts = str.split(/\s+/);
    const timePart = parts[parts.length - 1];
    if (timePart.includes(':')) {
      return normalizeTimeString(timePart);
    }
  }

  // Handle standard HH:MM(:SS)? (AM|PM)?
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
    const meridian = ampmMatch[4] ? ampmMatch[4].toUpperCase() : null;

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Handle pure digits if not caught earlier
  if (/^\d{1,6}$/.test(str)) {
    return parseUnefaTime(str);
  }

  return str;
}

/**
 * Extracts normalized YYYY-MM-DD date string from various input types
 */
export function normalizeDateString(val: unknown): string {
  if (val === null || val === undefined) return '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    // Use UTC ISO date slice to prevent timezone shift issues
    return val.toISOString().slice(0, 10);
  }

  // Excel serial date number (e.g. 45352 or "45352")
  const numVal = typeof val === 'number' ? val : Number(val);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 65000) {
    const date = new Date((numVal - (25567 + 2)) * 86400 * 1000);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) return '';

  // Case: ISO "2024-03-01T..." or "2024-03-01 ..."
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, '0');
    const m = ddmmyyyyMatch[2].padStart(2, '0');
    const y = ddmmyyyyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Case: DD/MM/YY or DD-MM-YY (e.g. 01/09/26)
  const ddmmyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (ddmmyyMatch) {
    const d = ddmmyyMatch[1].padStart(2, '0');
    const m = ddmmyyMatch[2].padStart(2, '0');
    const y = `20${ddmmyyMatch[3]}`;
    return `${y}-${m}-${d}`;
  }

  // Case: YYYYMMDD (e.g. 20260901)
  const yyyymmddMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (yyyymmddMatch) {
    return `${yyyymmddMatch[1]}-${yyyymmddMatch[2]}-${yyyymmddMatch[3]}`;
  }

  // Case: DDMMYYYY (e.g. 01092026)
  const ddmmyyyyNumMatch = str.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (ddmmyyyyNumMatch) {
    return `${ddmmyyyyNumMatch[3]}-${ddmmyyyyNumMatch[2]}-${ddmmyyyyNumMatch[1]}`;
  }

  return str.split(' ')[0];
}

/**
 * Converts HH:MM:SS time string to seconds from midnight
 */
export function timeStringToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;

  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Computes difference in hours between earliest time and latest time.
 * Returns { grossHours, netHours, isNeutralCase, status, scheduledHours, varianceHours }
 */
export function calculateAttendanceHours(
  earliestTime: string,
  latestTime: string
): {
  grossHours: number;
  lunchDeductionHours: number;
  netHours: number;
  scheduledHours: number;
  varianceHours: number;
  isNeutralCase: boolean;
  status: 'CUMPLIDO' | 'SUPERAVIT' | 'DEFICIT' | 'NEUTRAL';
} {
  const startSec = timeStringToSeconds(earliestTime);
  const endSec = timeStringToSeconds(latestTime);

  // If one of the times is missing or invalid
  if (startSec === null || endSec === null) {
    return {
      grossHours: 0,
      lunchDeductionHours: 0,
      netHours: 0,
      scheduledHours: 0,
      varianceHours: 0,
      isNeutralCase: true,
      status: 'NEUTRAL',
    };
  }

  // If earliest == latest (or difference < 2 minutes: single punch)
  const diffSeconds = endSec - startSec;
  if (diffSeconds <= 120) {
    // Single punch: neutral case! Rule: "sin restarle horas ni computar déficit artificial"
    return {
      grossHours: 0,
      lunchDeductionHours: 0,
      netHours: 0,
      scheduledHours: 0,
      varianceHours: 0,
      isNeutralCase: true,
      status: 'NEUTRAL',
    };
  }

  const grossHours = Math.round((diffSeconds / 3600) * 100) / 100;
  // Apply lunch deduction (1.5 hours)
  const lunchDeductionHours = LUNCH_DEDUCTION_HOURS;
  const netHours = Math.max(0, Math.round((grossHours - lunchDeductionHours) * 100) / 100);

  const scheduledHours = SCHEDULED_DAILY_HOURS;
  const varianceHours = Math.round((netHours - scheduledHours) * 100) / 100;

  let status: 'CUMPLIDO' | 'SUPERAVIT' | 'DEFICIT' = 'CUMPLIDO';
  if (varianceHours > 0.05) {
    status = 'SUPERAVIT';
  } else if (varianceHours < -0.05) {
    status = 'DEFICIT';
  }

  return {
    grossHours,
    lunchDeductionHours,
    netHours,
    scheduledHours,
    varianceHours,
    isNeutralCase: false,
    status,
  };
}

/**
 * Format decimal hours to string (e.g. 8.5 -> "8.50 h")
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(2)} h`;
}

/**
 * Format decimal hours to human readable "8h 30m"
 */
export function formatHoursToHhMm(hours: number): string {
  const isNegative = hours < 0;
  const absHours = Math.abs(hours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  return `${isNegative ? '-' : ''}${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Format variance with explicit sign (+0.50 h / -0.50 h)
 */
export function formatVariance(hours: number): string {
  if (Math.abs(hours) < 0.01) return '0.00 h';
  const sign = hours > 0 ? '+' : '';
  return `${sign}${hours.toFixed(2)} h`;
}

/**
 * Parses YYYY-MM-DD safely into year, month (1-12), day (1-31) without timezone shift
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Format UTC Date to YYYY-MM-DD
 */
export function formatDateToISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTH_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const DAY_NAMES_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Formats a YYYY-MM-DD date into friendly Spanish text
 */
export function formatDateSpanish(dateStr: string, includeDayOfWeek: boolean = false): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayName = DAY_NAMES_ES[utc.getUTCDay()];
  const monthName = MONTH_SHORT_ES[parts.month - 1];
  if (includeDayOfWeek) {
    return `${dayName} ${parts.day} de ${monthName}`;
  }
  return `${parts.day} ${monthName} ${parts.year}`;
}

/**
 * Returns Monday to Sunday range containing the given date
 */
export function getWeekRangeForDate(dateStr: string): { startDate: string; endDate: string; label: string } {
  const parts = parseDateParts(dateStr);
  if (!parts) return { startDate: dateStr, endDate: dateStr, label: dateStr };

  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayOfWeek = utc.getUTCDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monDate = new Date(utc.getTime() + diffToMonday * 86400000);
  const sunDate = new Date(utc.getTime() + (diffToMonday + 6) * 86400000);

  const start = formatDateToISO(monDate);
  const end = formatDateToISO(sunDate);

  const startParts = parseDateParts(start)!;
  const endParts = parseDateParts(end)!;

  const label = `Semana del ${startParts.day} ${MONTH_SHORT_ES[startParts.month - 1]} al ${endParts.day} ${MONTH_SHORT_ES[endParts.month - 1]}`;
  return { startDate: start, endDate: end, label };
}

/**
 * Returns the Fortnight (Quincena) range:
 * - 1st to 15th if day <= 15
 * - 16th to end of month if day > 15
 */
export function getFortnightRangeForDate(dateStr: string): { startDate: string; endDate: string; label: string } {
  const parts = parseDateParts(dateStr);
  if (!parts) return { startDate: dateStr, endDate: dateStr, label: dateStr };

  const monthName = MONTH_NAMES_ES[parts.month - 1];
  const mm = parts.month.toString().padStart(2, '0');

  if (parts.day <= 15) {
    const startDate = `${parts.year}-${mm}-01`;
    const endDate = `${parts.year}-${mm}-15`;
    return {
      startDate,
      endDate,
      label: `1ra Quincena (${monthName} ${parts.year})`,
    };
  } else {
    // End of month
    const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
    const startDate = `${parts.year}-${mm}-16`;
    const endDate = `${parts.year}-${mm}-${lastDay.toString().padStart(2, '0')}`;
    return {
      startDate,
      endDate,
      label: `2da Quincena (${monthName} ${parts.year})`,
    };
  }
}

/**
 * Returns full calendar month range (01 to last day)
 */
export function getMonthRangeForDate(dateStr: string): { startDate: string; endDate: string; label: string } {
  const parts = parseDateParts(dateStr);
  if (!parts) return { startDate: dateStr, endDate: dateStr, label: dateStr };

  const mm = parts.month.toString().padStart(2, '0');
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const startDate = `${parts.year}-${mm}-01`;
  const endDate = `${parts.year}-${mm}-${lastDay.toString().padStart(2, '0')}`;

  return {
    startDate,
    endDate,
    label: `${MONTH_NAMES_ES[parts.month - 1]} ${parts.year}`,
  };
}
