import * as XLSX from 'xlsx';
import { AttendanceRecord, EmployeeSummary, GlobalKPIs, SiteSummary } from '../types/attendance';
import { calculateAttendanceHours, SCHEDULED_DAILY_HOURS } from './timeUtils';

export const SAMPLE_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  // --- Opeconca records (Oficina Opeconca) ---
  {
    id: 'ope_1',
    employeeName: 'Carlos Mendoza',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '08:00:15',
    latestTime: '17:31:40',
    isNeutralCase: false,
    grossHours: 9.52,
    lunchDeductionHours: 1.5,
    netHours: 8.02,
    scheduledHours: 8.0,
    varianceHours: 0.02,
    status: 'CUMPLIDO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: '4 marcaciones registradas',
  },
  {
    id: 'ope_2',
    employeeName: 'Carlos Mendoza',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-02',
    earliestTime: '07:55:00',
    latestTime: '17:45:10',
    isNeutralCase: false,
    grossHours: 9.84,
    lunchDeductionHours: 1.5,
    netHours: 8.34,
    scheduledHours: 8.0,
    varianceHours: 0.34,
    status: 'SUPERAVIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: '4 marcaciones registradas',
  },
  {
    id: 'ope_3',
    employeeName: 'Carlos Mendoza',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-03',
    earliestTime: '08:25:00',
    latestTime: '17:10:00',
    isNeutralCase: false,
    grossHours: 8.75,
    lunchDeductionHours: 1.5,
    netHours: 7.25,
    scheduledHours: 8.0,
    varianceHours: -0.75,
    status: 'DEFICIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: 'Salida anticipada',
  },
  {
    id: 'ope_4',
    employeeName: 'Mariana Silva',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '07:58:30',
    latestTime: '17:35:12',
    isNeutralCase: false,
    grossHours: 9.61,
    lunchDeductionHours: 1.5,
    netHours: 8.11,
    scheduledHours: 8.0,
    varianceHours: 0.11,
    status: 'CUMPLIDO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: '5 marcaciones registradas',
  },
  {
    id: 'ope_5',
    employeeName: 'Mariana Silva',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-02',
    earliestTime: '08:05:00',
    latestTime: '08:05:00',
    isNeutralCase: true,
    grossHours: 0,
    lunchDeductionHours: 0,
    netHours: 0,
    scheduledHours: 0,
    varianceHours: 0,
    status: 'NEUTRAL',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: 'Marcación única registrada (Caso Neutral)',
  },
  {
    id: 'ope_6',
    employeeName: 'Mariana Silva',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-03',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: '4 marcaciones registradas',
  },
  {
    id: 'ope_7',
    employeeName: 'Javier Rodríguez',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '08:15:20',
    latestTime: '17:30:10',
    isNeutralCase: false,
    grossHours: 9.25,
    lunchDeductionHours: 1.5,
    netHours: 7.75,
    scheduledHours: 8.0,
    varianceHours: -0.25,
    status: 'DEFICIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: 'Llegada 08:15 AM',
  },
  {
    id: 'ope_8',
    employeeName: 'Javier Rodríguez',
    department: 'Operaciones Opeconca',
    site: 'Oficina Opeconca',
    date: '2026-09-02',
    earliestTime: '07:50:00',
    latestTime: '17:35:00',
    isNeutralCase: false,
    grossHours: 9.75,
    lunchDeductionHours: 1.5,
    netHours: 8.25,
    scheduledHours: 8.0,
    varianceHours: 0.25,
    status: 'SUPERAVIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: '4 marcaciones registradas',
  },

  // --- Nalys records (Reporte diario Nalys) ---
  {
    id: 'nal_1',
    employeeName: 'Andrea Morales',
    department: 'Logística',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '07:50:00',
    latestTime: '17:35:00',
    isNeutralCase: false,
    grossHours: 9.75,
    lunchDeductionHours: 1.5,
    netHours: 8.25,
    scheduledHours: 8.0,
    varianceHours: 0.25,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_2',
    employeeName: 'Andrea Morales',
    department: 'Logística',
    site: 'Nalys',
    date: '2026-09-02',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_3',
    employeeName: 'Andrea Morales',
    department: 'Logística',
    site: 'Nalys',
    date: '2026-09-03',
    earliestTime: '08:02:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.47,
    lunchDeductionHours: 1.5,
    netHours: 7.97,
    scheduledHours: 8.0,
    varianceHours: -0.03,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_4',
    employeeName: 'Roberto Gómez',
    department: 'Mantenimiento',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_5',
    employeeName: 'Roberto Gómez',
    department: 'Mantenimiento',
    site: 'Nalys',
    date: '2026-09-02',
    earliestTime: '08:10:00',
    latestTime: '08:10:00',
    isNeutralCase: true,
    grossHours: 0,
    lunchDeductionHours: 0,
    netHours: 0,
    scheduledHours: 0,
    varianceHours: 0,
    status: 'NEUTRAL',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
    notes: 'Marcación única (Caso Neutral)',
  },
  {
    id: 'nal_6',
    employeeName: 'Roberto Gómez',
    department: 'Mantenimiento',
    site: 'Nalys',
    date: '2026-09-03',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_7',
    employeeName: 'Lucía Benítez',
    department: 'Calidad',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '08:30:00',
    latestTime: '17:15:00',
    isNeutralCase: false,
    grossHours: 8.75,
    lunchDeductionHours: 1.5,
    netHours: 7.25,
    scheduledHours: 8.0,
    varianceHours: -0.75,
    status: 'DEFICIT',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_8',
    employeeName: 'Lucía Benítez',
    department: 'Calidad',
    site: 'Nalys',
    date: '2026-09-02',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },

  // --- UNEFA records (Reporte diario UNEFA, HHMMSS) ---
  {
    id: 'unefa_1',
    employeeName: 'Gabriel Castillo',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '07:55:00',
    latestTime: '17:35:00',
    isNeutralCase: false,
    grossHours: 9.67,
    lunchDeductionHours: 1.5,
    netHours: 8.17,
    scheduledHours: 8.0,
    varianceHours: 0.17,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_2',
    employeeName: 'Gabriel Castillo',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-02',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_3',
    employeeName: 'Gabriel Castillo',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-03',
    earliestTime: '07:50:00',
    latestTime: '17:40:00',
    isNeutralCase: false,
    grossHours: 9.83,
    lunchDeductionHours: 1.5,
    netHours: 8.33,
    scheduledHours: 8.0,
    varianceHours: 0.33,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_4',
    employeeName: 'Daniela Paredes',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_5',
    employeeName: 'Daniela Paredes',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-02',
    earliestTime: '08:12:00',
    latestTime: '08:12:00',
    isNeutralCase: true,
    grossHours: 0,
    lunchDeductionHours: 0,
    netHours: 0,
    scheduledHours: 0,
    varianceHours: 0,
    status: 'NEUTRAL',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
    notes: 'Marcación única (Caso Neutral)',
  },
  {
    id: 'unefa_6',
    employeeName: 'Fernando Rivas',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '08:40:00',
    latestTime: '17:20:00',
    isNeutralCase: false,
    grossHours: 8.67,
    lunchDeductionHours: 1.5,
    netHours: 7.17,
    scheduledHours: 8.0,
    varianceHours: -0.83,
    status: 'DEFICIT',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_7',
    employeeName: 'Fernando Rivas',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-02',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_8',
    employeeName: 'Gabriel Medina',
    department: 'Sede UNEFA',
    site: 'UNEFA',
    date: '2026-09-02',
    earliestTime: '-',
    latestTime: '-',
    isNeutralCase: false,
    isAbsence: true,
    isJustified: false,
    grossHours: 0,
    lunchDeductionHours: 0,
    netHours: 0,
    scheduledHours: 8.0,
    varianceHours: -8.0,
    status: 'INASISTENCIA',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
    notes: 'Inasistencia no justificada (Día no asistido)',
  },
  {
    id: 'opeconca_9',
    employeeName: 'Valentina Torres',
    department: 'Oficina Central',
    site: 'Oficina Opeconca',
    date: '2026-09-02',
    earliestTime: '-',
    latestTime: '-',
    isNeutralCase: true,
    isAbsence: true,
    isJustified: true,
    justificationReason: 'Reposo Médico / Salud',
    justificationDocument: 'Constancia Médica IVSS #9482',
    grossHours: 0,
    lunchDeductionHours: 0,
    netHours: 0,
    scheduledHours: 0,
    varianceHours: 0,
    status: 'JUSTIFICADO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
    notes: 'Inasistencia justificada: Reposo Médico IVSS #9482',
  },

  // --- Extended Opeconca Staff ---
  {
    id: 'ope_10',
    employeeName: 'Ricardo Gómez',
    department: 'Administración & Finanzas',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
  },
  {
    id: 'ope_11',
    employeeName: 'Patricia Morales',
    department: 'Recursos Humanos',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '07:45:00',
    latestTime: '17:45:00',
    isNeutralCase: false,
    grossHours: 10.0,
    lunchDeductionHours: 1.5,
    netHours: 8.5,
    scheduledHours: 8.0,
    varianceHours: 0.5,
    status: 'SUPERAVIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
  },
  {
    id: 'ope_12',
    employeeName: 'Héctor Salazar',
    department: 'Tecnología y Sistemas',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '08:05:00',
    latestTime: '17:35:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
  },
  {
    id: 'ope_13',
    employeeName: 'Elena Vivas',
    department: 'Compras y Logística',
    site: 'Oficina Opeconca',
    date: '2026-09-01',
    earliestTime: '08:20:00',
    latestTime: '17:25:00',
    isNeutralCase: false,
    grossHours: 9.08,
    lunchDeductionHours: 1.5,
    netHours: 7.58,
    scheduledHours: 8.0,
    varianceHours: -0.42,
    status: 'DEFICIT',
    sourceFile: 'Biometrico_Opeconca_Septiembre.xlsx',
  },

  // --- Extended Nalys Staff ---
  {
    id: 'nal_9',
    employeeName: 'Marcos Villegas',
    department: 'Producción & Planta',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '07:50:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.67,
    lunchDeductionHours: 1.5,
    netHours: 8.17,
    scheduledHours: 8.0,
    varianceHours: 0.17,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_10',
    employeeName: 'Diana Contreras',
    department: 'Control de Calidad',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_11',
    employeeName: 'Samuel Pineda',
    department: 'Mantenimiento Electromecánico',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_12',
    employeeName: 'Carolina Soto',
    department: 'Almacén de Repuestos',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '07:55:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.58,
    lunchDeductionHours: 1.5,
    netHours: 8.08,
    scheduledHours: 8.0,
    varianceHours: 0.08,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },
  {
    id: 'nal_13',
    employeeName: 'Andrés Albornoz',
    department: 'Seguridad Industrial',
    site: 'Nalys',
    date: '2026-09-01',
    earliestTime: '08:10:00',
    latestTime: '17:15:00',
    isNeutralCase: false,
    grossHours: 9.08,
    lunchDeductionHours: 1.5,
    netHours: 7.58,
    scheduledHours: 8.0,
    varianceHours: -0.42,
    status: 'DEFICIT',
    sourceFile: 'Reporte_Diario_Nalys.xlsx',
  },

  // --- Extended UNEFA Staff ---
  {
    id: 'unefa_9',
    employeeName: 'Beatriz Camacho',
    department: 'Coordinación Académica',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_10',
    employeeName: 'Manuel Quintero',
    department: 'Soporte Técnico',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '07:50:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.67,
    lunchDeductionHours: 1.5,
    netHours: 8.17,
    scheduledHours: 8.0,
    varianceHours: 0.17,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_11',
    employeeName: 'Yolanda Suárez',
    department: 'Biblioteca y Archivo',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '08:00:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.5,
    lunchDeductionHours: 1.5,
    netHours: 8.0,
    scheduledHours: 8.0,
    varianceHours: 0.0,
    status: 'CUMPLIDO',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
  {
    id: 'unefa_12',
    employeeName: 'Jorge Colmenares',
    department: 'Servicios Generales',
    site: 'UNEFA',
    date: '2026-09-01',
    earliestTime: '07:45:00',
    latestTime: '17:30:00',
    isNeutralCase: false,
    grossHours: 9.75,
    lunchDeductionHours: 1.5,
    netHours: 8.25,
    scheduledHours: 8.0,
    varianceHours: 0.25,
    status: 'SUPERAVIT',
    sourceFile: 'Reporte_Diario_UNEFA.xlsx',
  },
];

/**
 * Computes Employee Summaries from records
 */
export function computeEmployeeSummaries(records: AttendanceRecord[]): EmployeeSummary[] {
  const map = new Map<
    string,
    {
      site: string;
      department: string;
      totalDays: number;
      validDays: number;
      neutralDays: number;
      absenceDays: number;
      justifiedDays: number;
      totalGross: number;
      totalNet: number;
      totalScheduled: number;
    }
  >();

  records.forEach((r) => {
    if (!map.has(r.employeeName)) {
      map.set(r.employeeName, {
        site: r.site,
        department: r.department,
        totalDays: 0,
        validDays: 0,
        neutralDays: 0,
        absenceDays: 0,
        justifiedDays: 0,
        totalGross: 0,
        totalNet: 0,
        totalScheduled: 0,
        diurnalOvertime: 0,
        nocturnalOvertime: 0,
        holidayWorked: 0,
        unjustifiedAbsences: 0,
      });
    }

    const current = map.get(r.employeeName)!;
    current.totalDays += 1;

    // Accumulate HR Overtime & Holiday
    if (r.diurnalOvertimeHours) {
      current.diurnalOvertime += r.diurnalOvertimeHours;
    } else if (r.varianceHours > 0 && !r.isNeutralCase && !r.isAbsence) {
      current.diurnalOvertime += r.varianceHours;
    }

    if (r.nocturnalOvertimeHours) {
      current.nocturnalOvertime += r.nocturnalOvertimeHours;
    }

    if (r.holidayWorkedHours) {
      current.holidayWorked += r.holidayWorkedHours;
    } else if (r.isHoliday) {
      current.holidayWorked += r.netHours;
    }

    if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
      current.absenceDays += 1;
      current.unjustifiedAbsences += 1;
      current.validDays += 1;
      current.totalScheduled += r.scheduledHours || 8.0;
      // 0 net hours added
    } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
      current.justifiedDays += 1;
      current.neutralDays += 1;
      // 0 scheduled and 0 net to avoid deficit
    } else if (r.isNeutralCase) {
      current.neutralDays += 1;
    } else {
      current.validDays += 1;
      current.totalGross += r.grossHours;
      current.totalNet += r.netHours;
      current.totalScheduled += r.scheduledHours;
    }
  });

  const list: EmployeeSummary[] = [];

  map.forEach((data, employeeName) => {
    const net = Math.round(data.totalNet * 100) / 100;
    const scheduled = Math.round(data.totalScheduled * 100) / 100;
    const variance = Math.round((net - scheduled) * 100) / 100;
    const rate = scheduled > 0 ? Math.round((net / scheduled) * 1000) / 10 : 100;

    let status: 'OPTIMO' | 'EN_DEFICIT' | 'CON_OBSERVACION' = 'OPTIMO';
    if (data.absenceDays > 0) {
      status = 'EN_DEFICIT';
    } else if (data.neutralDays > 0) {
      status = 'CON_OBSERVACION';
    } else if (variance < -0.5) {
      status = 'EN_DEFICIT';
    }

    list.push({
      employeeName,
      site: data.site,
      department: data.department,
      totalDays: data.totalDays,
      validDays: data.validDays,
      neutralDays: data.neutralDays,
      absenceDays: data.absenceDays,
      justifiedDays: data.justifiedDays,
      totalGrossHours: Math.round(data.totalGross * 100) / 100,
      totalNetHours: net,
      totalScheduledHours: scheduled,
      varianceHours: variance,
      complianceRate: rate,
      status,
      diurnalOvertimeHours: Math.round(data.diurnalOvertime * 100) / 100,
      nocturnalOvertimeHours: Math.round(data.nocturnalOvertime * 100) / 100,
      holidayWorkedHours: Math.round(data.holidayWorked * 100) / 100,
      unjustifiedAbsenceCount: data.unjustifiedAbsences,
    });
  });

  list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return list;
}

/**
 * Computes Site Summaries from records
 */
export function computeSiteSummaries(records: AttendanceRecord[]): SiteSummary[] {
  const map = new Map<
    string,
    {
      employees: Set<string>;
      totalRecords: number;
      totalNet: number;
      totalScheduled: number;
      neutralCases: number;
      absenceCases: number;
      justifiedCases: number;
    }
  >();

  records.forEach((r) => {
    if (!map.has(r.site)) {
      map.set(r.site, {
        employees: new Set(),
        totalRecords: 0,
        totalNet: 0,
        totalScheduled: 0,
        neutralCases: 0,
        absenceCases: 0,
        justifiedCases: 0,
      });
    }

    const current = map.get(r.site)!;
    current.employees.add(r.employeeName);
    current.totalRecords += 1;

    if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
      current.absenceCases += 1;
      current.totalScheduled += r.scheduledHours || 8.0;
    } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
      current.justifiedCases += 1;
      current.neutralCases += 1;
    } else if (r.isNeutralCase) {
      current.neutralCases += 1;
    } else {
      current.totalNet += r.netHours;
      current.totalScheduled += r.scheduledHours;
    }
  });

  const list: SiteSummary[] = [];

  map.forEach((data, site) => {
    const net = Math.round(data.totalNet * 100) / 100;
    const scheduled = Math.round(data.totalScheduled * 100) / 100;
    const variance = Math.round((net - scheduled) * 100) / 100;
    const rate = scheduled > 0 ? Math.round((net / scheduled) * 1000) / 10 : 100;

    list.push({
      site,
      totalEmployees: data.employees.size,
      totalRecords: data.totalRecords,
      totalNetHours: net,
      totalScheduledHours: scheduled,
      varianceHours: variance,
      complianceRate: rate,
      neutralCases: data.neutralCases,
      absenceCases: data.absenceCases,
      justifiedCases: data.justifiedCases,
    });
  });

  list.sort((a, b) => a.site.localeCompare(b.site));
  return list;
}

/**
 * Computes Global KPIs
 */
export function computeGlobalKPIs(
  records: AttendanceRecord[],
  employeeSummaries: EmployeeSummary[]
): GlobalKPIs {
  const totalEmployees = employeeSummaries.length;
  let totalNet = 0;
  let totalScheduled = 0;
  let totalNeutral = 0;
  let totalAbsences = 0;
  let totalJustified = 0;
  const uniqueDates = new Set<string>();

  records.forEach((r) => {
    uniqueDates.add(r.date);
    if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
      totalAbsences += 1;
      totalScheduled += r.scheduledHours || 8.0;
    } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
      totalJustified += 1;
      totalNeutral += 1;
    } else if (r.isNeutralCase) {
      totalNeutral += 1;
    } else {
      totalNet += r.netHours;
      totalScheduled += r.scheduledHours;
    }
  });

  totalNet = Math.round(totalNet * 100) / 100;
  totalScheduled = Math.round(totalScheduled * 100) / 100;
  const rate = totalScheduled > 0 ? Math.round((totalNet / totalScheduled) * 1000) / 10 : 100;

  return {
    totalEmployees,
    totalNetHours: totalNet,
    totalScheduledHours: totalScheduled,
    globalComplianceRate: rate,
    totalNeutralCases: totalNeutral,
    totalAbsences,
    totalJustified,
    totalDaysRecorded: uniqueDates.size,
    totalRecords: records.length,
  };
}

/**
 * Download a real sample Excel file for any of the 3 supported formats
 */
export function downloadSampleTemplate(format: 'OPECONCA' | 'NALYS' | 'UNEFA') {
  const wb = XLSX.utils.book_new();

  if (format === 'OPECONCA') {
    // Biométrico Oficina Opeconca (Hora, Tarjeta, Puerta, Explicación, Nombre)
    const data = [
      ['Hora', 'Tarjeta', 'Puerta', 'Explicación', 'Nombre'],
      ['2026-09-01 08:00:15', '1042', 'Puerta Principal', 'Entrada General', 'Carlos Mendoza'],
      ['2026-09-01 13:00:10', '1042', 'Torniquete PB', 'Salida Almuerzo', 'Carlos Mendoza'],
      ['2026-09-01 14:30:25', '1042', 'Torniquete PB', 'Entrada Almuerzo', 'Carlos Mendoza'],
      ['2026-09-01 17:31:40', '1042', 'Puerta Principal', 'Salida Fin Jornada', 'Carlos Mendoza'],
      ['2026-09-01 07:58:30', '1058', 'Puerta Principal', 'Entrada General', 'Mariana Silva'],
      ['2026-09-01 17:35:12', '1058', 'Puerta Principal', 'Salida Fin Jornada', 'Mariana Silva'],
      ['2026-09-01 08:15:20', '1099', 'Puerta Principal', 'Entrada General', 'Javier Rodríguez'],
      ['2026-09-01 17:30:10', '1099', 'Puerta Principal', 'Salida Fin Jornada', 'Javier Rodríguez'],
      ['2026-09-01 08:00:00', '1105', 'Puerta Principal', 'Entrada General', 'Ricardo Gómez'],
      ['2026-09-01 17:30:00', '1105', 'Puerta Principal', 'Salida Fin Jornada', 'Ricardo Gómez'],
      ['2026-09-01 07:45:00', '1112', 'Puerta Principal', 'Entrada General', 'Patricia Morales'],
      ['2026-09-01 17:45:00', '1112', 'Puerta Principal', 'Salida Fin Jornada', 'Patricia Morales'],
      ['2026-09-01 08:05:00', '1120', 'Puerta Principal', 'Entrada General', 'Héctor Salazar'],
      ['2026-09-01 17:35:00', '1120', 'Puerta Principal', 'Salida Fin Jornada', 'Héctor Salazar'],
      ['2026-09-01 08:20:00', '1134', 'Puerta Principal', 'Entrada General', 'Elena Vivas'],
      ['2026-09-01 17:25:00', '1134', 'Puerta Principal', 'Salida Fin Jornada', 'Elena Vivas'],
      // Neutral case example (single punch)
      ['2026-09-02 08:05:00', '1058', 'Puerta Principal', 'Entrada General', 'Mariana Silva'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Marcaciones');
    XLSX.writeFile(wb, 'Plantilla_Biometrico_Opeconca.xlsx');
  } else if (format === 'NALYS') {
    // Reporte diario Nalys (Grabar fecha, Apellido y Nombre, Departamento, Hora más temprana, última Hora)
    const data = [
      ['Grabar fecha', 'Apellido y Nombre', 'Departamento', 'Hora más temprana', 'última Hora'],
      ['2026-09-01', 'Andrea Morales', 'Logística', '07:50:00', '17:35:00'],
      ['2026-09-01', 'Roberto Gómez', 'Mantenimiento', '08:00:00', '17:30:00'],
      ['2026-09-01', 'Lucía Benítez', 'Calidad', '08:30:00', '17:15:00'],
      ['2026-09-01', 'Marcos Villegas', 'Producción & Planta', '07:50:00', '17:30:00'],
      ['2026-09-01', 'Diana Contreras', 'Control de Calidad', '08:00:00', '17:30:00'],
      ['2026-09-01', 'Samuel Pineda', 'Mantenimiento Electromecánico', '08:00:00', '17:30:00'],
      ['2026-09-01', 'Carolina Soto', 'Almacén de Repuestos', '07:55:00', '17:30:00'],
      ['2026-09-01', 'Andrés Albornoz', 'Seguridad Industrial', '08:10:00', '17:15:00'],
      ['2026-09-02', 'Andrea Morales', 'Logística', '08:00:00', '17:30:00'],
      // Neutral case: only earliest time or earliest == latest
      ['2026-09-02', 'Roberto Gómez', 'Mantenimiento', '08:10:00', '08:10:00'],
      ['2026-09-02', 'Lucía Benítez', 'Calidad', '08:00:00', '17:30:00'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Nalys');
    XLSX.writeFile(wb, 'Plantilla_Reporte_Nalys.xlsx');
  } else {
    // Reporte diario UNEFA (Nombre, Apellido, Grabar fecha, Hora más temprana, última Hora en formato HHMMSS numérico)
    const data = [
      ['Nombre', 'Apellido', 'Grabar fecha', 'Hora más temprana', 'última Hora'],
      ['Gabriel', 'Castillo', '2026-09-01', 75500, 173500],
      ['Daniela', 'Paredes', '2026-09-01', 80000, 173000],
      ['Fernando', 'Rivas', '2026-09-01', 84000, 172000],
      ['Beatriz', 'Camacho', '2026-09-01', 80000, 173000],
      ['Manuel', 'Quintero', '2026-09-01', 75000, 173000],
      ['Yolanda', 'Suárez', '2026-09-01', 80000, 173000],
      ['Jorge', 'Colmenares', '2026-09-01', 74500, 173000],
      ['Gabriel', 'Castillo', '2026-09-02', 80000, 173000],
      // Neutral case: same time or missing end time
      ['Daniela', 'Paredes', '2026-09-02', 81200, 81200],
      ['Fernando', 'Rivas', '2026-09-02', 80000, 173000],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_UNEFA');
    XLSX.writeFile(wb, 'Plantilla_Reporte_UNEFA.xlsx');
  }
}
