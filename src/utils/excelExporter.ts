import * as XLSX from 'xlsx';
import { AttendanceRecord, EmployeeSummary, GlobalKPIs, SiteSummary } from '../types/attendance';
import {
  LUNCH_DEDUCTION_HOURS,
  OFFICIAL_END_TIME,
  OFFICIAL_GROSS_HOURS,
  OFFICIAL_START_TIME,
  SCHEDULED_DAILY_HOURS,
} from './timeUtils';

export function exportConsolidatedExcel(
  records: AttendanceRecord[],
  employeeSummaries: EmployeeSummary[],
  siteSummaries: SiteSummary[],
  kpis: GlobalKPIs
) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Panel de Control (Executive Dashboard)
  // -------------------------------------------------------------
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const controlPanelData: (string | number)[][] = [
    ['REPORTE CONSOLIDADO DE ASISTENCIA Y JORNADA LABORAL'],
    ['Generado el:', todayStr],
    [''],
    ['--- INDICADORES CLAVE DE GESTIÓN (KPIs) ---'],
    ['Métrica', 'Valor', 'Unidad / Observación'],
    ['Total Empleados Activos', kpis.totalEmployees, 'Personas registradas en el período'],
    ['Total Registros Diarios', kpis.totalRecords, 'Jornadas procesadas'],
    ['Total Horas Netas Trabajadas', kpis.totalNetHours, 'Horas netas computadas (post-almuerzo)'],
    ['Total Horas Programadas', kpis.totalScheduledHours, 'Base exigible (8.00 h/día laborable)'],
    [
      'Cumplimiento Global',
      `${kpis.globalComplianceRate.toFixed(1)}%`,
      kpis.globalComplianceRate >= 100 ? 'Meta cumplida o superávit' : 'Déficit general registrado',
    ],
    ['Total Casos Neutrales / Incompletos', kpis.totalNeutralCases, 'Sin salida/entrada única (no penalizados)'],
    [''],
    ['--- RESUMEN POR SEDE / FUENTE BIOMÉTRICA ---'],
    ['Sede / Fuente', 'Empleados', 'Registros', 'Horas Netas (h)', 'Horas Prog. (h)', 'Diferencia (h)', '% Cumplimiento', 'Casos Neutrales'],
  ];

  siteSummaries.forEach((s) => {
    controlPanelData.push([
      s.site,
      s.totalEmployees,
      s.totalRecords,
      s.totalNetHours,
      s.totalScheduledHours,
      s.varianceHours,
      `${s.complianceRate.toFixed(1)}%`,
      s.neutralCases,
    ]);
  });

  const wsControl = XLSX.utils.aoa_to_sheet(controlPanelData);
  // Column widths
  wsControl['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 45 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsControl, 'Panel de Control');

  // -------------------------------------------------------------
  // Sheet 2: Resumen por Empleado
  // -------------------------------------------------------------
  const employeeData: (string | number)[][] = [
    [
      'Colaborador',
      'Sede Principal',
      'Departamento',
      'Días Registrados',
      'Días Válidos',
      'Casos Neutrales',
      'Horas Brutas (h)',
      'Horas Netas (h)',
      'Horas Programadas (h)',
      'Diferencia / Balance (h)',
      '% Cumplimiento',
      'Estado',
    ],
  ];

  employeeSummaries.forEach((emp) => {
    let estado = 'Óptimo';
    if (emp.status === 'EN_DEFICIT') estado = 'Con Déficit';
    if (emp.status === 'CON_OBSERVACION') estado = 'Requiere Revisión';

    employeeData.push([
      emp.employeeName,
      emp.site,
      emp.department,
      emp.totalDays,
      emp.validDays,
      emp.neutralDays,
      emp.totalGrossHours,
      emp.totalNetHours,
      emp.totalScheduledHours,
      emp.varianceHours,
      `${emp.complianceRate.toFixed(1)}%`,
      estado,
    ]);
  });

  const wsEmployee = XLSX.utils.aoa_to_sheet(employeeData);
  wsEmployee['!cols'] = [
    { wch: 32 },
    { wch: 22 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEmployee, 'Resumen por Empleado');

  // -------------------------------------------------------------
  // Sheet 3: Registro Diario Consolidado
  // -------------------------------------------------------------
  const dailyData: (string | number)[][] = [
    [
      'Fecha',
      'Colaborador',
      'Sede / Fuente',
      'Departamento',
      'Hora Entrada (Temprana)',
      'Hora Salida (Última)',
      'Permanencia Bruta (h)',
      'Deducción Almuerzo (h)',
      'Horas Netas (h)',
      'Jornada Programada (h)',
      'Diferencia (h)',
      'Estado Asistencia',
      'Archivo Origen',
      'Observaciones',
    ],
  ];

  records.forEach((rec) => {
    let statusText = 'Cumplido';
    if (rec.status === 'SUPERAVIT') statusText = 'Superávit';
    if (rec.status === 'DEFICIT') statusText = 'Déficit';
    if (rec.status === 'NEUTRAL') statusText = 'Incompleto / Caso Neutral';

    dailyData.push([
      rec.date,
      rec.employeeName,
      rec.site,
      rec.department,
      rec.earliestTime,
      rec.latestTime,
      rec.isNeutralCase ? 'N/A' : rec.grossHours,
      rec.isNeutralCase ? 0 : rec.lunchDeductionHours,
      rec.isNeutralCase ? 0 : rec.netHours,
      rec.isNeutralCase ? 0 : rec.scheduledHours,
      rec.isNeutralCase ? 0 : rec.varianceHours,
      statusText,
      rec.sourceFile,
      rec.notes || (rec.isNeutralCase ? 'Marcación única sin penalización' : 'Jornada normal'),
    ]);
  });

  const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
  wsDaily['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 26 },
    { wch: 28 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Registro Diario Consolidado');

  // -------------------------------------------------------------
  // Sheet 4: Parámetros y Reglas de Negocio
  // -------------------------------------------------------------
  const parametersData: (string | number)[][] = [
    ['PARÁMETROS Y REGLAS DE NEGOCIO DEL SISTEMA DE ASISTENCIA'],
    [''],
    ['Parámetro', 'Valor Configurado', 'Descripción y Fundamento'],
    [
      'Jornada Programada Diaria',
      `${SCHEDULED_DAILY_HOURS.toFixed(2)} horas`,
      'Horas netas exigibles por día hábil laboral según política corporativa.',
    ],
    [
      'Permanencia Oficial de Referencia',
      `${OFFICIAL_START_TIME} a ${OFFICIAL_END_TIME}`,
      `Horario institucional (08:00 AM a 05:30 PM), equivalente a ${OFFICIAL_GROSS_HOURS} horas brutas en sitio.`,
    ],
    [
      'Deducción Fija de Almuerzo',
      `${LUNCH_DEDUCTION_HOURS.toFixed(2)} horas (1h 30m)`,
      'Se descuenta de manera automática de la permanencia bruta para calcular las horas netas efectivas.',
    ],
    [
      'Fórmula de Horas Netas',
      'Horas Netas = max(0, Permanencia Bruta - 1.50 h)',
      'Aplica para jornadas con marcación válida de entrada y salida separadas.',
    ],
    [
      'Tratamiento de Casos Neutrales',
      'Sin penalización ni déficit artificial',
      'Si un colaborador tiene una sola marcación en el día (entrada sin salida o salida sin entrada), se clasifica como Incompleto / Caso Neutral. No se descuentan horas ni se crea déficit artificial.',
    ],
    [''],
    ['FORMATOS BIOMÉTRICOS INTEGRADOS'],
    ['Formato', 'Sede Reconocida', 'Estructura de Columnas'],
    [
      'Biométrico Oficina Opeconca',
      'Oficina Opeconca',
      'Hora, Tarjeta, Puerta, Explicación, Nombre (Agrupa múltiples marcaciones por día para obtener entrada y salida).',
    ],
    [
      'Reporte diario Nalys',
      'Nalys',
      'Grabar fecha, Apellido y Nombre, Departamento, Hora más temprana, última Hora.',
    ],
    [
      'Reporte diario UNEFA',
      'UNEFA',
      'Nombre, Apellido, Grabar fecha, Hora más temprana, última Hora (en formato numérico HHMMSS).',
    ],
  ];

  const wsParameters = XLSX.utils.aoa_to_sheet(parametersData);
  wsParameters['!cols'] = [{ wch: 34 }, { wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsParameters, 'Parámetros');

  // Generate file name with current timestamp
  const dateFile = new Date().toISOString().slice(0, 10);
  const fileName = `Reporte_Consolidado_Asistencia_${dateFile}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Exports a dedicated Daily Attendance Report Excel file
 */
export function exportDailyExcel(date: string, records: AttendanceRecord[]) {
  const wb = XLSX.utils.book_new();

  // Compute day stats
  const totalEmployees = new Set(records.map((r) => r.employeeName)).size;
  const totalNet = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0).toFixed(2));
  const totalSched = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.scheduledHours), 0).toFixed(2));
  const totalVariance = Number((totalNet - totalSched).toFixed(2));
  const neutralCount = records.filter((r) => r.isNeutralCase).length;
  const deficitCount = records.filter((r) => r.status === 'DEFICIT').length;
  const superavitCount = records.filter((r) => r.status === 'SUPERAVIT').length;
  const cumplidoCount = records.filter((r) => r.status === 'CUMPLIDO').length;
  const compliance = totalSched > 0 ? (totalNet / totalSched) * 100 : 100;

  // Sheet 1: Resumen Diario
  const summaryData: (string | number)[][] = [
    ['REPORTE DIARIO DE ASISTENCIA LABORAL'],
    ['Fecha Evaluada:', date],
    ['Generado el:', new Date().toLocaleString('es-ES')],
    [''],
    ['--- INDICADORES DE LA JORNADA ---'],
    ['Indicador', 'Valor', 'Descripción'],
    ['Colaboradores Presentes', totalEmployees, 'Personal con marcación registrada'],
    ['Total Horas Netas Computadas', totalNet, 'Horas efectivas (post-deducción 1.5h almuerzo)'],
    ['Total Horas Programadas', totalSched, 'Base exigible del día (8.00 h/persona)'],
    ['Balance de Horas del Día', totalVariance, totalVariance >= 0 ? 'Superávit general de la jornada' : 'Déficit general de la jornada'],
    ['% Cumplimiento de la Jornada', `${compliance.toFixed(1)}%`, compliance >= 100 ? 'Meta cumplida' : 'Bajo meta'],
    ['Jornadas Cumplidas Exactas (8.0h)', cumplidoCount, 'Colaboradores con jornada estándar exacta'],
    ['Jornadas en Superávit (>8.0h)', superavitCount, 'Colaboradores con horas extras/excedentes'],
    ['Jornadas en Déficit (<8.0h)', deficitCount, 'Colaboradores que no completaron 8.0h netas'],
    ['Casos Incompletos / Neutrales', neutralCount, 'Marcación única (no penalizados con déficit)'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Diario');

  // Sheet 2: Detalle de Asistencia
  const detailData: (string | number)[][] = [
    [
      'Colaborador',
      'Sede / Fuente',
      'Departamento',
      'Hora Entrada',
      'Hora Salida',
      'Permanencia Bruta (h)',
      'Deducción Almuerzo (h)',
      'Horas Netas (h)',
      'Jornada Programada (h)',
      'Diferencia / Balance (h)',
      'Estado',
      'Archivo Origen',
      'Observaciones',
    ],
  ];

  records.forEach((r) => {
    let estado = 'Cumplido';
    if (r.status === 'SUPERAVIT') estado = 'Superávit';
    if (r.status === 'DEFICIT') estado = 'Déficit';
    if (r.status === 'NEUTRAL') estado = 'Caso Neutral / Incompleto';

    detailData.push([
      r.employeeName,
      r.site,
      r.department,
      r.earliestTime,
      r.latestTime,
      r.isNeutralCase ? 'N/A' : r.grossHours,
      r.isNeutralCase ? 0 : r.lunchDeductionHours,
      r.isNeutralCase ? 0 : r.netHours,
      r.isNeutralCase ? 0 : r.scheduledHours,
      r.isNeutralCase ? 0 : r.varianceHours,
      estado,
      r.sourceFile,
      r.notes || (r.isNeutralCase ? 'Marcación única sin penalización' : 'Jornada normal'),
    ]);
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 28 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle de Asistencia');

  XLSX.writeFile(wb, `Reporte_Diario_Asistencia_${date}.xlsx`);
}

/**
 * Exports a dedicated Weekly Attendance Report with day-by-day matrix
 */
export function exportWeeklyExcel(
  weekTitle: string,
  startDate: string,
  endDate: string,
  records: AttendanceRecord[]
) {
  const wb = XLSX.utils.book_new();

  // Find all unique dates in the week sorted
  const dates = Array.from(new Set(records.map((r) => r.date))).sort();
  const employees = Array.from(new Set(records.map((r) => r.employeeName))).sort();

  // Sheet 1: Resumen Semanal
  const totalNet = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0).toFixed(2));
  const totalSched = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.scheduledHours), 0).toFixed(2));
  const totalVariance = Number((totalNet - totalSched).toFixed(2));
  const compliance = totalSched > 0 ? (totalNet / totalSched) * 100 : 100;

  const summaryData: (string | number)[][] = [
    ['REPORTE SEMANAL DE ASISTENCIA LABORAL'],
    ['Semana / Período:', weekTitle],
    ['Rango de Fechas:', `Desde ${startDate} hasta ${endDate}`],
    ['Generado el:', new Date().toLocaleString('es-ES')],
    [''],
    ['--- INDICADORES DE LA SEMANA ---'],
    ['Indicador', 'Valor', 'Descripción'],
    ['Colaboradores Activos', employees.length, 'Personal con actividad en la semana'],
    ['Días con Registros', dates.length, 'Jornadas laborales computadas'],
    ['Total Horas Netas Semanales', totalNet, 'Horas efectivas acumuladas en la semana'],
    ['Total Horas Programadas', totalSched, 'Horas exigibles según días laborados'],
    ['Balance Semanal de Horas', totalVariance, totalVariance >= 0 ? 'Superávit acumulado' : 'Déficit acumulado'],
    ['% Cumplimiento Semanal', `${compliance.toFixed(1)}%`, compliance >= 100 ? 'Meta semanal cumplida' : 'Bajo meta semanal'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Semanal');

  // Sheet 2: Matriz Semanal (Colaborador x Días)
  const headerRow: (string | number)[] = ['Colaborador', 'Sede', 'Departamento'];
  dates.forEach((d) => headerRow.push(`Día ${d}`));
  headerRow.push('Total Netas (h)', 'Horas Prog. (h)', 'Diferencia (h)', '% Cumplimiento', 'Estado Semanal');

  const matrixData: (string | number)[][] = [headerRow];

  employees.forEach((empName) => {
    const empRecords = records.filter((r) => r.employeeName === empName);
    const sample = empRecords[0];
    const site = sample ? sample.site : 'General';
    const dept = sample ? sample.department : 'General';

    let empNetTotal = 0;
    let empSchedTotal = 0;

    const row: (string | number)[] = [empName, site, dept];

    dates.forEach((d) => {
      const dayRec = empRecords.find((r) => r.date === d);
      if (dayRec) {
        if (dayRec.isNeutralCase) {
          row.push('Neutral (0h)');
        } else {
          row.push(dayRec.netHours);
          empNetTotal += dayRec.netHours;
          empSchedTotal += dayRec.scheduledHours;
        }
      } else {
        row.push('-');
      }
    });

    empNetTotal = Number(empNetTotal.toFixed(2));
    empSchedTotal = Number(empSchedTotal.toFixed(2));
    const empDiff = Number((empNetTotal - empSchedTotal).toFixed(2));
    const empComp = empSchedTotal > 0 ? (empNetTotal / empSchedTotal) * 100 : 100;
    let estado = 'Óptimo';
    if (empDiff < -0.1) estado = 'En Déficit';
    if (empDiff > 0.1) estado = 'Superávit';

    row.push(empNetTotal, empSchedTotal, empDiff, `${empComp.toFixed(1)}%`, estado);
    matrixData.push(row);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  const matrixCols: { wch: number }[] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }];
  dates.forEach(() => matrixCols.push({ wch: 14 }));
  matrixCols.push({ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 });
  wsMatrix['!cols'] = matrixCols;
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriz Semanal');

  XLSX.writeFile(wb, `Reporte_Semanal_Asistencia_${startDate}_al_${endDate}.xlsx`);
}

/**
 * Exports a dedicated Monthly Attendance Report
 */
export function exportMonthlyExcel(
  monthTitle: string,
  records: AttendanceRecord[],
  employeeSummaries: EmployeeSummary[],
  siteSummaries: SiteSummary[]
) {
  const wb = XLSX.utils.book_new();

  // Stats
  const totalDays = new Set(records.map((r) => r.date)).size;
  const totalNet = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0).toFixed(2));
  const totalSched = Number(records.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.scheduledHours), 0).toFixed(2));
  const totalVariance = Number((totalNet - totalSched).toFixed(2));
  const totalNeutral = records.filter((r) => r.isNeutralCase).length;
  const compliance = totalSched > 0 ? (totalNet / totalSched) * 100 : 100;

  // Sheet 1: Resumen Ejecutivo Mensual
  const summaryData: (string | number)[][] = [
    ['REPORTE MENSUAL CONSOLIDADO DE ASISTENCIA LABORAL'],
    ['Mes Evaluado:', monthTitle],
    ['Generado el:', new Date().toLocaleString('es-ES')],
    [''],
    ['--- INDICADORES GLOBALES DEL MES ---'],
    ['Indicador', 'Valor', 'Descripción'],
    ['Días con Registro en el Mes', totalDays, 'Jornadas laborales procesadas en el mes'],
    ['Colaboradores Activos', employeeSummaries.length, 'Personal evaluado en el mes'],
    ['Total Horas Netas Computadas', totalNet, 'Horas efectivas acumuladas (post-almuerzo)'],
    ['Total Horas Programadas Exigibles', totalSched, 'Horas base según días válidos (8.00 h/día)'],
    ['Balance Neto del Mes', totalVariance, totalVariance >= 0 ? 'Superávit acumulado' : 'Déficit acumulado'],
    ['% Cumplimiento Global del Mes', `${compliance.toFixed(1)}%`, compliance >= 100 ? 'Meta mensual cumplida' : 'Déficit mensual'],
    ['Total Casos Neutrales en el Mes', totalNeutral, 'Marcaciones incompletas sin penalizar'],
    [''],
    ['--- RENDIMIENTO POR SEDE EN EL MES ---'],
    ['Sede', 'Colaboradores', 'Registros', 'Horas Netas (h)', 'Horas Prog. (h)', 'Diferencia (h)', '% Cumplimiento', 'Neutrales'],
  ];

  siteSummaries.forEach((s) => {
    summaryData.push([
      s.site,
      s.totalEmployees,
      s.totalRecords,
      s.totalNetHours,
      s.totalScheduledHours,
      s.varianceHours,
      `${s.complianceRate.toFixed(1)}%`,
      s.neutralCases,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 45 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');

  // Sheet 2: Consolidado Colaboradores del Mes
  const empData: (string | number)[][] = [
    [
      'Colaborador',
      'Sede',
      'Departamento',
      'Días Asistidos',
      'Días Válidos',
      'Casos Neutrales',
      'Horas Brutas (h)',
      'Horas Netas (h)',
      'Horas Programadas (h)',
      'Diferencia (h)',
      '% Cumplimiento',
      'Estado',
    ],
  ];

  employeeSummaries.forEach((e) => {
    let estado = 'Óptimo';
    if (e.status === 'EN_DEFICIT') estado = 'En Déficit';
    if (e.status === 'CON_OBSERVACION') estado = 'Con Observación';

    empData.push([
      e.employeeName,
      e.site,
      e.department,
      e.totalDays,
      e.validDays,
      e.neutralDays,
      e.totalGrossHours,
      e.totalNetHours,
      e.totalScheduledHours,
      e.varianceHours,
      `${e.complianceRate.toFixed(1)}%`,
      estado,
    ]);
  });

  const wsEmp = XLSX.utils.aoa_to_sheet(empData);
  wsEmp['!cols'] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEmp, 'Colaboradores del Mes');

  XLSX.writeFile(wb, `Reporte_Mensual_Asistencia_${monthTitle.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Exports an Excel workbook formatted in the standardized detailed Attendance Report structure,
 * featuring exact column headers:
 * [Grabar fecha, Apellido y Nombre, Departamento, Hora más temprana, última Hora]
 * followed by full audit columns (Permanencia Bruta, Deducción 1.5h Almuerzo, Horas Netas, Jornada Exigible, Balance, Estado).
 *
 * It is 100% round-trip compatible with the biometric import parsers.
 */
export function exportDetailedAttendanceExcel(
  records: AttendanceRecord[],
  options?: {
    customFileName?: string;
    includeAuditColumns?: boolean;
    includeSummarySheet?: boolean;
    dateLabel?: string;
    sheetName?: string;
  }
) {
  if (!records || records.length === 0) return;

  const wb = XLSX.utils.book_new();
  const includeAudit = options?.includeAuditColumns !== false;
  const includeSummary = options?.includeSummarySheet !== false;
  const sheetTitle = options?.sheetName || 'Reporte_Asistencia';

  // Sort records: chronologically by date, then alphabetically by employee
  const sortedRecords = [...records].sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return a.employeeName.localeCompare(b.employeeName);
  });

  // -------------------------------------------------------------
  // Sheet 1: Reporte_Asistencia (Exact Standardized Structure)
  // -------------------------------------------------------------
  const headerRow: (string | number)[] = [
    'Grabar fecha',
    'Apellido y Nombre',
    'Departamento',
    'Hora más temprana',
    'última Hora',
  ];

  if (includeAudit) {
    headerRow.push(
      'Permanencia Bruta (h)',
      'Deducción Almuerzo (h)',
      'Horas Netas (h)',
      'Jornada Exigible (h)',
      'Diferencia / Balance (h)',
      'Estado',
      'Observaciones / Justificación'
    );
  }

  const sheetRows: (string | number)[][] = [headerRow];

  sortedRecords.forEach((r) => {
    const cleanDate = r.date || '';
    const cleanName = (r.employeeName || '').trim().toUpperCase();
    const cleanDept = (r.department || 'OPERACIONES').trim().toUpperCase();

    // Earliest and latest punches
    let horaTemprana = r.earliestTime || 'Sin registro';
    let ultimaHora = r.latestTime || 'Sin registro';

    if (r.isAbsence) {
      horaTemprana = 'Sin registro';
      ultimaHora = 'Sin registro';
    }

    const row: (string | number)[] = [
      cleanDate,
      cleanName,
      cleanDept,
      horaTemprana,
      ultimaHora,
    ];

    if (includeAudit) {
      let statusLabel = 'CUMPLIDO';
      if (r.isAbsence) {
        statusLabel = r.isJustified ? 'FALTA JUSTIFICADA' : 'INASISTENCIA INJUSTIFICADA';
      } else if (r.status === 'SUPERAVIT') {
        statusLabel = 'SUPERÁVIT (+)';
      } else if (r.status === 'DEFICIT') {
        statusLabel = 'DÉFICIT (-)';
      } else if (r.status === 'NEUTRAL') {
        statusLabel = 'CASO NEUTRAL (1 MARCA)';
      }

      let obs = r.notes || '';
      if (r.isAbsence && r.justificationReason) {
        obs = `Justificado: ${r.justificationReason}${r.justificationDocument ? ' (Con comprobante)' : ''}`;
      } else if (r.isAbsence && !r.isJustified) {
        obs = 'Inasistencia sin comprobante registrada (-8.00 h)';
      } else if (r.isNeutralCase) {
        obs = 'Marcación única sin penalización de déficit';
      } else if (!obs) {
        obs = 'Jornada normal procesada';
      }

      row.push(
        r.isNeutralCase ? 'N/A' : (r.isAbsence ? 0 : r.grossHours),
        r.isNeutralCase ? 0 : (r.isAbsence ? 0 : r.lunchDeductionHours),
        r.isNeutralCase ? 0 : (r.isAbsence ? 0 : r.netHours),
        r.isNeutralCase ? 0 : r.scheduledHours,
        r.isNeutralCase ? 0 : r.varianceHours,
        statusLabel,
        obs
      );
    }

    sheetRows.push(row);
  });

  const wsMain = XLSX.utils.aoa_to_sheet(sheetRows);

  // Column widths carefully tuned
  const cols = [
    { wch: 14 }, // Grabar fecha
    { wch: 34 }, // Apellido y Nombre
    { wch: 22 }, // Departamento
    { wch: 18 }, // Hora más temprana
    { wch: 18 }, // última Hora
  ];

  if (includeAudit) {
    cols.push(
      { wch: 22 }, // Permanencia Bruta (h)
      { wch: 22 }, // Deducción Almuerzo (h)
      { wch: 18 }, // Horas Netas (h)
      { wch: 20 }, // Jornada Exigible (h)
      { wch: 22 }, // Diferencia / Balance (h)
      { wch: 26 }, // Estado
      { wch: 40 }  // Observaciones / Justificación
    );
  }

  wsMain['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsMain, sheetTitle);

  // -------------------------------------------------------------
  // Sheet 2: Resumen Ejecutivo (Optional)
  // -------------------------------------------------------------
  const uniqueDates = Array.from(new Set(sortedRecords.map((r) => r.date).filter(Boolean))).sort();
  const dateSpanStr =
    uniqueDates.length <= 1
      ? uniqueDates[0] || 'Día único'
      : `${uniqueDates[0]} al ${uniqueDates[uniqueDates.length - 1]}`;

  if (includeSummary) {
    const uniqueEmps = new Set(sortedRecords.map((r) => r.employeeName)).size;
    const totalNet = Number(sortedRecords.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0).toFixed(2));
    const totalSched = Number(sortedRecords.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.scheduledHours), 0).toFixed(2));
    const totalVar = Number((totalNet - totalSched).toFixed(2));
    const absences = sortedRecords.filter((r) => r.isAbsence).length;
    const justified = sortedRecords.filter((r) => r.isAbsence && r.isJustified).length;
    const neutral = sortedRecords.filter((r) => r.isNeutralCase).length;
    const compliance = totalSched > 0 ? (totalNet / totalSched) * 100 : 100;

    const summaryData: (string | number)[][] = [
      ['REPORTE CONSOLIDADO DE ASISTENCIA Y BALANCE HORARIO'],
      ['Período / Rango de Fechas:', dateSpanStr],
      ['Generado el:', new Date().toLocaleString('es-ES')],
      ['Regla de Almuerzo Aplicada:', 'Deducción fija automática de 1.50 horas (1h 30m)'],
      [''],
      ['--- INDICADORES GENERALES DE ASISTENCIA ---'],
      ['Indicador', 'Valor', 'Observación'],
      ['Colaboradores en Nómina', uniqueEmps, 'Personal registrado en la muestra'],
      ['Total Jornadas Procesadas', sortedRecords.length, 'Líneas de asistencia evaluadas'],
      ['Total Horas Netas Computadas', totalNet, 'Horas efectivas posteriores a deducción de almuerzo'],
      ['Total Horas Programadas Exigibles', totalSched, '8.00 h base por jornada hábil'],
      ['Balance General de Horas', totalVar, totalVar >= 0 ? 'Superávit general a favor' : 'Déficit acumulado en contra'],
      ['% Cumplimiento Operativo', `${compliance.toFixed(1)}%`, compliance >= 100 ? 'Meta alcanzada o superada' : 'Por debajo de meta'],
      ['Inasistencias Justificadas', justified, 'Con comprobante o motivo validado'],
      ['Inasistencias Injustificadas', absences - justified, 'Computadas como 0h (-8.00h déficit)'],
      ['Casos Neutrales / Incompletos', neutral, 'Marcación única sin penalización'],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Ejecutivo');
  }

  // File naming
  const fileDateTag = options?.dateLabel || dateSpanStr.replace(/\s+/g, '_');
  const fileName = options?.customFileName || `Reporte_Asistencia_${fileDateTag}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Backward compatibility alias for exportDetailedAttendanceExcel
 */
export const exportNalysStyleExcel = exportDetailedAttendanceExcel;

