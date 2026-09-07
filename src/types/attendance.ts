export type SourceFormat = 'OPECONCA' | 'NALYS' | 'UNEFA' | 'UNKNOWN';

export type AttendanceStatus =
  | 'CUMPLIDO'
  | 'SUPERAVIT'
  | 'DEFICIT'
  | 'NEUTRAL'
  | 'INASISTENCIA'
  | 'JUSTIFICADO';

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  department: string;
  site: 'Oficina Opeconca' | 'Nalys' | 'UNEFA' | string;
  date: string; // YYYY-MM-DD
  earliestTime: string; // HH:MM:SS or '-'
  latestTime: string; // HH:MM:SS or '-'
  isNeutralCase: boolean;
  grossHours: number; // Raw presence in decimal hours
  lunchDeductionHours: number; // 1.5h if valid, 0 if neutral or absence
  netHours: number; // grossHours - 1.5h (or 0 if neutral / absence)
  scheduledHours: number; // 8.0h if normal day or inasistencia, 0 if neutral or justificado
  varianceHours: number; // netHours - scheduledHours (-8.0h for inasistencia)
  status: AttendanceStatus;
  sourceFile: string;
  notes?: string;
  isAbsence?: boolean;
  isJustified?: boolean;
  justificationReason?: string; // e.g. "Reposo Médico", "Permiso Personal", "Comisión de Servicio"
  justificationDocument?: string; // Document ID / receipt
  justifiedAt?: string;
}

export interface EmployeeSummary {
  employeeName: string;
  site: string;
  department: string;
  totalDays: number;
  validDays: number;
  neutralDays: number;
  absenceDays: number;
  justifiedDays: number;
  totalGrossHours: number;
  totalNetHours: number;
  totalScheduledHours: number;
  varianceHours: number; // positive = superavit, negative = deficit
  complianceRate: number; // percentage (0 - 100+)
  status: 'OPTIMO' | 'EN_DEFICIT' | 'CON_OBSERVACION';
}

export interface SiteSummary {
  site: string;
  totalEmployees: number;
  totalRecords: number;
  totalNetHours: number;
  totalScheduledHours: number;
  varianceHours: number;
  complianceRate: number;
  neutralCases: number;
  absenceCases: number;
  justifiedCases: number;
}

export interface GlobalKPIs {
  totalEmployees: number;
  totalNetHours: number;
  totalScheduledHours: number;
  globalComplianceRate: number;
  totalNeutralCases: number;
  totalAbsences: number;
  totalJustified: number;
  totalDaysRecorded: number;
  totalRecords: number;
}

export interface LoadedFileMeta {
  id: string;
  name: string;
  size: number;
  format: SourceFormat;
  recordsCount: number;
  loadedAt: Date;
  rawRowsCount?: number;
  headerRowIndex?: number;
  uniqueEmployeesCount?: number;
  neutralCasesCount?: number;
  skippedRowsCount?: number;
  sheetName?: string;
  sheetNames?: string[];
  detectedColumns?: string[];
  employeeNames?: string[];
  targetDate?: string;
}

export type PeriodFilterMode =
  | 'ALL'
  | 'LATEST'
  | 'WEEK'
  | 'FORTNIGHT'
  | 'MONTH'
  | 'CUSTOM';

export interface PeriodFilterState {
  mode: PeriodFilterMode;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  anchorDate: string; // Reference date for relative ranges
  customStartDate?: string;
  customEndDate?: string;
}
