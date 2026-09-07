import * as XLSX from 'xlsx';
import { AttendanceRecord, SourceFormat } from '../types/attendance';
import {
  calculateAttendanceHours,
  normalizeDateString,
  normalizeTimeString,
  parseUnefaTime,
} from './timeUtils';
import { parseExcelWithWorker } from './excelWorkerClient';

export interface ParseAudit {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  totalRawRows: number;
  headerRowIndex: number;
  validRecordsCount: number;
  uniqueEmployeesCount: number;
  neutralCasesCount: number;
  skippedEmptyRows: number;
  detectedColumns: string[];
  employeeList: string[];
  statusSummary: {
    cumplidos: number;
    superavit: number;
    deficit: number;
    neutral: number;
  };
}

export interface ParseResult {
  format: SourceFormat;
  records: AttendanceRecord[];
  fileName: string;
  rowCount: number;
  formatDescription: string;
  siteName: string;
  audit: ParseAudit;
}

/**
 * Clean and normalize a column key: lowercase, strip accents and non-alphanumeric chars
 */
function cleanKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // alphanumeric only
}

/**
 * Keywords used to locate the true header row in spreadsheets with top titles/banners
 */
const KNOWN_HEADER_KEYWORDS = [
  'tarjeta',
  'card',
  'puerta',
  'door',
  'explicacion',
  'nombre',
  'nombres',
  'apellido',
  'apellidos',
  'apellidoynombre',
  'nombreyapellido',
  'apellidosynombres',
  'nombresyapellidos',
  'nombrecompleto',
  'grabarfecha',
  'fecha',
  'date',
  'hora',
  'horamastemprana',
  'ultimahora',
  'departamento',
  'depto',
  'area',
  'seccion',
  'empleado',
  'empleados',
  'colaborador',
  'colaboradores',
  'funcionario',
  'funcionarios',
  'personal',
  'trabajador',
  'trabajadores',
  'entrada',
  'salida',
  'persona',
  'personas',
  'cedula',
  'ci',
  'dni',
  'id',
  'tiempo',
  'evento',
  'usuario',
  'usuarios',
  'ficha',
  'codigo',
  'badge',
  'docente',
  'operador',
  'ingreso',
  'egreso',
  'desde',
  'hasta',
];

/**
 * Derives a human-friendly site name from fileName or sheetName
 */
export function deriveSiteName(fileName?: string, sheetName?: string): string {
  const combined = `${fileName || ''} ${sheetName || ''}`.toLowerCase();
  if (combined.includes('opeconca')) return 'Oficina Opeconca';
  if (combined.includes('nalys')) return 'Nalys';
  if (combined.includes('unefa')) return 'UNEFA';

  // Check sheet name first if specific
  if (sheetName) {
    const s = sheetName.trim();
    const cleanS = s.toLowerCase();
    const isGenericSheet =
      cleanS.startsWith('hoja') ||
      cleanS.startsWith('sheet') ||
      cleanS.startsWith('table') ||
      cleanS.startsWith('page') ||
      cleanS.includes('asistencia') ||
      cleanS.includes('reporte') ||
      cleanS.includes('consolidado') ||
      cleanS.includes('datos') ||
      cleanS.includes('septiembre') ||
      cleanS.includes('agosto') ||
      cleanS.includes('octubre') ||
      /^\d+$/.test(cleanS);

    if (!isGenericSheet && s.length >= 2 && s.length <= 40) {
      return s;
    }
  }

  // Check fileName
  if (fileName) {
    let name = fileName.replace(/\.[^/.]+$/, ''); // remove extension (.xlsx, .xls)
    // Remove dates like 2026-09-01 or 01-09-2026 or 01092026
    name = name.replace(/\b\d{1,4}[-_/.]\d{1,2}[-_/.]\d{1,4}\b/g, '');
    name = name.replace(/\b\d{6,8}\b/g, '');
    // Remove common prefixes
    name = name.replace(/^(reporte|asistencia|biometrico|control|consolidado|diario|mensual|semanal|reloj)[_\s-]+/gi, '');
    name = name.replace(/[_\s-]+(reporte|asistencia|biometrico|control|consolidado|diario|mensual|semanal|reloj)$/gi, '');
    name = name.replace(/[_\s-]+/g, ' ').trim();

    if (name.length >= 2 && name.length <= 40) {
      // Capitalize first letter of each word
      return name
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Sede Principal';
}

/**
 * Detects the source format based on cleaned column headers and optional sheet/file hints
 */
export function detectFormat(
  keys: string[],
  sheetNameHint?: string,
  fileNameHint?: string
): { format: SourceFormat; description: string; siteName: string } {
  const cleaned = keys.map(cleanKey);
  const hint = `${cleanKey(sheetNameHint || '')} ${cleanKey(fileNameHint || '')}`;

  // Format 1: Biométrico Oficina Opeconca (Hora, Tarjeta, Puerta, Explicación, Nombre)
  const hasTarjeta = cleaned.some((k) => k.includes('tarjeta') || k.includes('card') || k.includes('ficha'));
  const hasPuerta = cleaned.some((k) => k.includes('puerta') || k.includes('door') || k.includes('acceso'));
  const hasExplicacion = cleaned.some((k) => k.includes('explicacion') || k.includes('evento') || k.includes('dispositivo'));

  if (hint.includes('opeconca') || (hasTarjeta && (hasPuerta || hasExplicacion))) {
    return {
      format: 'OPECONCA',
      description: 'Biométrico Oficina Opeconca (Marcaciones individuales)',
      siteName: 'Oficina Opeconca',
    };
  }

  // Format 2: Reporte diario Nalys (Grabar fecha, Apellido y Nombre, Departamento, Hora más temprana, última Hora)
  const hasGrabarFecha = cleaned.some((k) => k.includes('grabarfecha') || k.includes('fecha') || k.includes('date'));
  const hasApellidoYNombre = cleaned.some(
    (k) =>
      k.includes('apellidoynombre') ||
      k.includes('nombreyapellido') ||
      k.includes('apellidosynombres') ||
      k.includes('nombresyapellidos') ||
      k.includes('nombrecompleto')
  );
  const hasDepartamento = cleaned.some(
    (k) => k.includes('departamento') || k.includes('depto') || k.includes('area') || k.includes('seccion')
  );
  const hasHoraTemprana = cleaned.some(
    (k) => k.includes('horamastemprana') || k.includes('temprana') || k.includes('primera') || k.includes('entrada')
  );
  const hasUltimaHora = cleaned.some(
    (k) => k.includes('ultimahora') || k.includes('tardia') || k.includes('salida') || k.includes('ultima')
  );

  if (hint.includes('nalys') || (hasGrabarFecha && (hasApellidoYNombre || hasDepartamento) && (hasHoraTemprana || hasUltimaHora))) {
    return {
      format: 'NALYS',
      description: 'Reporte diario Nalys (Consolidado diario)',
      siteName: 'Nalys',
    };
  }

  // Format 3: Reporte diario UNEFA (Nombre, Apellido, Grabar fecha, Hora más temprana, última Hora HHMMSS)
  if (hint.includes('unefa')) {
    return {
      format: 'UNEFA',
      description: 'Reporte diario UNEFA (Horas numéricas HHMMSS / Biométrico)',
      siteName: 'UNEFA',
    };
  }

  // Fallback checks
  if (hasTarjeta) {
    return {
      format: 'OPECONCA',
      description: 'Biométrico Oficina Opeconca (Detectado por Tarjeta/Ficha)',
      siteName: 'Oficina Opeconca',
    };
  }

  // Generic Tabular Report
  const derivedSite = deriveSiteName(fileNameHint, sheetNameHint);
  return {
    format: 'UNKNOWN',
    description: `Reporte de Asistencia (${derivedSite})`,
    siteName: derivedSite,
  };
}

/**
 * Finds the object property that matches any of the candidate keywords
 */
function findValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const matchedKey = rowKeys.find((k) => cleanKey(k).includes(candidate));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

/**
 * Candidate lists for robust column value extraction
 */
const NAME_CANDIDATES = [
  'apellidoynombre',
  'nombreyapellido',
  'apellidosynombres',
  'nombresyapellidos',
  'nombrecompleto',
  'nombre',
  'nombres',
  'apellido',
  'apellidos',
  'empleado',
  'empleados',
  'colaborador',
  'colaboradores',
  'funcionario',
  'funcionarios',
  'personal',
  'trabajador',
  'trabajadores',
  'persona',
  'personas',
  'usuario',
  'usuarios',
  'participante',
  'participantes',
  'operador',
  'chofer',
  'conductor',
  'vigilante',
  'docente',
  'descripcion',
  'name',
  'employee',
];

const CARD_ID_CANDIDATES = [
  'tarjeta',
  'card',
  'cedula',
  'ci',
  'dni',
  'identificacion',
  'documento',
  'ficha',
  'codigo',
  'cod',
  'id',
  'badge',
  'pin',
  'userid',
  'enrollid',
  'no',
  'nro',
];

const DATE_CANDIDATES = [
  'grabarfecha',
  'fechamarca',
  'fecha',
  'date',
  'dia',
  'fec',
  'fecharegistro',
  'timestamp',
];

const TIME_EARLY_CANDIDATES = [
  'horamastemprana',
  'temprana',
  'primera',
  'entrada',
  'in',
  'desde',
  'horaentrada',
  'ingreso',
  'checkin',
  'marcacion1',
  'marca1',
  'primermarcaje',
];

const TIME_LATE_CANDIDATES = [
  'ultimahora',
  'tardia',
  'salida',
  'out',
  'hasta',
  'horasalida',
  'egreso',
  'checkout',
  'ultima',
  'marcacion2',
  'marca2',
  'ultimomarcaje',
];

const TIME_GENERIC_CANDIDATES = [
  'hora',
  'time',
  'tiempo',
  'horamarcacion',
  'marcacion',
  'marcaje',
  'marca',
];

const DEPT_CANDIDATES = [
  'departamento',
  'depto',
  'area',
  'seccion',
  'gerencia',
  'division',
  'unidad',
  'cargo',
  'puesto',
  'oficina',
];

const SITE_CANDIDATES = [
  'sede',
  'sitio',
  'site',
  'sucursal',
  'ubicacion',
  'local',
  'planta',
  'oficina',
  'campus',
  'centro',
  'ciudad',
  'regional',
  'filial',
];

/**
 * Checks if a column name looks like a day of the month (e.g. 1..31, 01..31, or 01/09)
 */
function isDayColumn(header: string): { isDay: boolean; dayNumber?: number } {
  const cleaned = cleanKey(header);
  // Match "1".."31", "dia1".."dia31", "d1".."d31"
  const mDay = cleaned.match(/^(?:dia|d)?0?([1-9]|[12][0-9]|3[01])$/);
  if (mDay) {
    return { isDay: true, dayNumber: parseInt(mDay[1], 10) };
  }
  // Match date formatted header like "0109", "1sep", etc.
  const mDate = header.match(/\b0?([1-9]|[12][0-9]|3[01])[-/.]\d{1,2}\b/);
  if (mDate) {
    return { isDay: true, dayNumber: parseInt(mDate[1], 10) };
  }
  return { isDay: false };
}

/**
 * Intelligent helper to detect which column in rawRows is likely the employee name column
 * by inspecting actual cell content (looking for human names: words with letters, not dates/times).
 */
function detectNameColumnByContent(
  rows: Record<string, unknown>[],
  columns: string[]
): string | null {
  for (const col of columns) {
    let textCount = 0;
    let sampleSize = 0;

    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const val = rows[i][col];
      if (val === undefined || val === null || String(val).trim() === '') continue;
      sampleSize++;
      const s = String(val).trim();
      // Check if it looks like a person's name (contains letters, no numbers, length >= 4)
      if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,.'-]+$/.test(s) && s.length >= 4 && !s.includes(':')) {
        textCount++;
      }
    }

    if (sampleSize >= 3 && textCount / sampleSize >= 0.6) {
      return col;
    }
  }
  return null;
}

/**
 * Pure parsing engine that accepts an ArrayBuffer and fileName.
 * Can be executed seamlessly in Web Workers without any DOM / File dependency.
 */
export function parseExcelArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  overrideDate?: string,
  overrideSite?: string
): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo.');
  }

  const allRecords: AttendanceRecord[] = [];
  const recognizedEmployeesSet = new Set<string>();
  const processedSheetNames: string[] = [];
  let totalRawRowsCount = 0;
  let totalSkippedEmptyRows = 0;
  let primaryFormat: SourceFormat = 'UNKNOWN';
  let primaryDescription = 'Reporte General de Asistencia';
  let primarySiteName = overrideSite || 'General';
  const detectedColumnsAcrossSheets = new Set<string>();
  let primaryHeaderRowIndex = 0;

  // Process EVERY sheet in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!rawRows || rawRows.length === 0) continue;

    // Check if sheet has any non-empty cell at all
    const hasData = rawRows.some(
      (row) =>
        Array.isArray(row) &&
        row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );
    if (!hasData) continue;

    processedSheetNames.push(sheetName);
    totalRawRowsCount += rawRows.length;

    // 1. Locate the header row by keyword scoring (up to 35 rows deep)
    let headerRowIndex = 0;
    let maxKeywordMatches = 0;
    const maxScanRows = Math.min(35, rawRows.length);

    for (let r = 0; r < maxScanRows; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let matchCount = 0;
      for (const cell of row) {
        if (!cell) continue;
        const cleaned = cleanKey(String(cell));
        if (cleaned && KNOWN_HEADER_KEYWORDS.some((kw) => cleaned.includes(kw))) {
          matchCount++;
        }
      }

      if (matchCount > maxKeywordMatches) {
        maxKeywordMatches = matchCount;
        headerRowIndex = r;
      }
    }

    // Fallback if no keywords matched: find the first row with at least 2 non-empty string cells
    if (maxKeywordMatches === 0) {
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (
          Array.isArray(row) &&
          row.filter((c) => c !== null && c !== undefined && String(c).trim().length > 1).length >= 2
        ) {
          headerRowIndex = r;
          break;
        }
      }
    }

    if (primaryHeaderRowIndex === 0) {
      primaryHeaderRowIndex = headerRowIndex;
    }

    // 2. Extract column headers
    const headerRow = (rawRows[headerRowIndex] as unknown[]) || [];
    const columnHeaders: string[] = [];
    const usedColNames = new Set<string>();

    for (let c = 0; c < headerRow.length; c++) {
      let name = String(headerRow[c] || '').trim();
      if (!name) {
        name = `Col_${c + 1}`;
      }
      let finalName = name;
      let counter = 2;
      while (usedColNames.has(finalName)) {
        finalName = `${name}_${counter}`;
        counter++;
      }
      usedColNames.add(finalName);
      columnHeaders.push(finalName);
      detectedColumnsAcrossSheets.add(finalName);
    }

    // 3. Convert data rows to object records
    const sheetDataRows: Record<string, unknown>[] = [];
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const rowValues = rawRows[r] as unknown[];
      if (!rowValues || rowValues.length === 0) {
        totalSkippedEmptyRows++;
        continue;
      }

      const hasAnyValue = rowValues.some(
        (v) => v !== null && v !== undefined && String(v).trim() !== ''
      );
      if (!hasAnyValue) {
        totalSkippedEmptyRows++;
        continue;
      }

      const rowObj: Record<string, unknown> = {};
      for (let c = 0; c < columnHeaders.length; c++) {
        rowObj[columnHeaders[c]] = rowValues[c] !== undefined ? rowValues[c] : '';
      }
      sheetDataRows.push(rowObj);
    }

    if (sheetDataRows.length === 0) continue;

    // Detect format for this sheet
    const sheetFormatInfo = detectFormat(columnHeaders, sheetName, fileName);
    if (primaryFormat === 'UNKNOWN' || primaryFormat === 'OPECONCA') {
      if (sheetFormatInfo.format !== 'UNKNOWN') {
        primaryFormat = sheetFormatInfo.format;
        primaryDescription = sheetFormatInfo.description;
        primarySiteName = overrideSite || sheetFormatInfo.siteName;
      }
    }

    // Check if sheet is a HORIZONTAL MATRIX (e.g. days as columns 1..31)
    const dayCols = columnHeaders
      .map((col) => ({ col, ...isDayColumn(col) }))
      .filter((item) => item.isDay);

    const isMatrixFormat = dayCols.length >= 4;

    // Fallback date from sheet name, overrideDate, or current date
    let sheetFallbackDate = overrideDate;
    if (!sheetFallbackDate) {
      const parsedSheetDate = normalizeDateString(sheetName);
      if (parsedSheetDate && parsedSheetDate.length >= 8) {
        sheetFallbackDate = parsedSheetDate;
      }
    }
    if (!sheetFallbackDate) {
      // Look for any date cell in the first rows
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r] as unknown[];
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          const d = normalizeDateString(cell);
          if (d && d.length === 10) {
            sheetFallbackDate = d;
            break;
          }
        }
        if (sheetFallbackDate) break;
      }
    }
    if (!sheetFallbackDate) {
      sheetFallbackDate = new Date().toISOString().slice(0, 10);
    }

    // Fallback site from overrideSite, sheet name, file name, or format
    let sheetSite = overrideSite || sheetFormatInfo.siteName;
    const cleanSheet = cleanKey(sheetName);
    const cleanFile = cleanKey(fileName);
    if (!overrideSite) {
      if (cleanSheet.includes('opeconca') || cleanFile.includes('opeconca')) {
        sheetSite = 'Oficina Opeconca';
      } else if (cleanSheet.includes('nalys') || cleanFile.includes('nalys')) {
        sheetSite = 'Nalys';
      } else if (cleanSheet.includes('unefa') || cleanFile.includes('unefa')) {
        sheetSite = 'UNEFA';
      } else if (!sheetSite || sheetSite === 'General') {
        sheetSite = deriveSiteName(fileName, sheetName);
      }
    }

    // ----------------------------------------------------
    // CASE A: HORIZONTAL ATTENDANCE MATRIX
    // ----------------------------------------------------
    if (isMatrixFormat) {
      // Find employee name column
      let nameCol =
        columnHeaders.find((c) => NAME_CANDIDATES.some((kw) => cleanKey(c).includes(kw))) ||
        detectNameColumnByContent(sheetDataRows, columnHeaders);

      const deptCol = columnHeaders.find((c) =>
        DEPT_CANDIDATES.some((kw) => cleanKey(c).includes(kw))
      );
      const siteCol = columnHeaders.find((c) =>
        SITE_CANDIDATES.some((kw) => cleanKey(c).includes(kw))
      );

      const baseYear = sheetFallbackDate ? parseInt(sheetFallbackDate.slice(0, 4), 10) : 2026;
      const baseMonth = sheetFallbackDate ? parseInt(sheetFallbackDate.slice(5, 7), 10) : 9;

      for (const row of sheetDataRows) {
        let empName = nameCol && row[nameCol] ? String(row[nameCol]).trim() : '';
        if (!empName) {
          // Try finding any cell with a name
          const cardVal = findValue(row, CARD_ID_CANDIDATES);
          if (cardVal) {
            empName = `Tarjeta/Ficha #${cardVal}`;
          }
        }
        if (!empName) {
          totalSkippedEmptyRows++;
          continue;
        }

        empName = empName.replace(/\s+/g, ' ');
        recognizedEmployeesSet.add(empName);

        const department =
          deptCol && row[deptCol] ? String(row[deptCol]).trim() : 'Operaciones';
        const site = siteCol && row[siteCol] ? String(row[siteCol]).trim() : sheetSite;

        // Unpivot each day column
        for (const dayItem of dayCols) {
          const val = row[dayItem.col];
          if (val === undefined || val === null) continue;
          const valStr = String(val).trim();

          const dayNum = dayItem.dayNumber || 1;
          const dayDateStr = `${baseYear}-${baseMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;

          // Parse cell value: could be hours number, time range "08:00 - 17:30", or presence mark
          let earliestTime = '08:00:00';
          let latestTime = '17:30:00';
          let note: string | undefined = undefined;

          if (!valStr || valStr === '-' || valStr === '0' || valStr === '00:00') {
            // Absent / No punch on this day
            earliestTime = 'Sin registro';
            latestTime = 'Sin registro';
            note = 'Sin marcación en esta fecha (Registrado en matriz)';
          } else if (valStr.includes(':') || valStr.includes('-') || valStr.includes('/')) {
            // Range like "08:00 - 17:30" or "08:00/17:30"
            const parts = valStr.split(/[-/–—aA]/).map((p) => p.trim());
            if (parts.length >= 2) {
              earliestTime = normalizeTimeString(parts[0]) || '08:00:00';
              latestTime = normalizeTimeString(parts[1]) || '17:30:00';
            } else {
              earliestTime = normalizeTimeString(parts[0]) || '08:00:00';
              latestTime = earliestTime;
            }
          } else if (!isNaN(Number(valStr)) && Number(valStr) > 0) {
            // Number of hours, e.g. 8 or 9.5
            const numHrs = Number(valStr);
            const startHour = 8;
            const endHour = startHour + numHrs;
            earliestTime = '08:00:00';
            const endH = Math.min(23, Math.floor(endHour));
            const endM = Math.round((endHour - Math.floor(endHour)) * 60);
            latestTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
          } else if (['P', 'A', 'ASISTIO', 'SI', 'X', 'OK'].includes(valStr.toUpperCase())) {
            earliestTime = '08:00:00';
            latestTime = '17:30:00';
            note = 'Asistencia confirmada en matriz';
          } else {
            // Absence or neutral
            earliestTime = 'Sin registro';
            latestTime = 'Sin registro';
            note = `Estado en matriz: ${valStr}`;
          }

          const calc = calculateAttendanceHours(
            earliestTime === 'Sin registro' ? '' : earliestTime,
            latestTime === 'Sin registro' ? '' : latestTime
          );

          allRecords.push({
            id: `mat_${empName.replace(/[^a-zA-Z0-9]/g, '')}_${dayDateStr}_${Math.random().toString(36).slice(2, 6)}`,
            employeeName: empName,
            department,
            site,
            date: dayDateStr,
            earliestTime,
            latestTime,
            isNeutralCase: calc.isNeutralCase,
            grossHours: calc.grossHours,
            lunchDeductionHours: calc.lunchDeductionHours,
            netHours: calc.netHours,
            scheduledHours: calc.scheduledHours,
            varianceHours: calc.varianceHours,
            status: calc.status,
            sourceFile: fileName,
            notes: note || (calc.isNeutralCase ? 'Marcación única / Neutral' : undefined),
          });
        }
      }
      continue;
    }

    // ----------------------------------------------------
    // CASE B: BIOMETRIC / TABULAR ROW-BY-ROW FORMAT
    // ----------------------------------------------------
    let lastSeenDateInSheet = sheetFallbackDate;

    // Detect column mapping for this sheet
    let nameCol =
      columnHeaders.find((c) => NAME_CANDIDATES.some((kw) => cleanKey(c).includes(kw))) ||
      detectNameColumnByContent(sheetDataRows, columnHeaders);

    const firstNameCol = columnHeaders.find((c) => {
      const k = cleanKey(c);
      return k === 'nombre' || k === 'nombres' || k.includes('primernombre');
    });

    const lastNameCol = columnHeaders.find((c) => {
      const k = cleanKey(c);
      return k === 'apellido' || k === 'apellidos' || k.includes('primerapellido');
    });

    // Special handling for FORMAT 1: OPECONCA (multiple punches per employee per day)
    if (sheetFormatInfo.format === 'OPECONCA') {
      interface PunchEvent {
        employeeName: string;
        date: string;
        time: string;
        card: string;
        door: string;
        explanation: string;
        department: string;
        site: string;
      }

      const punches: PunchEvent[] = [];

      for (let rIdx = 0; rIdx < sheetDataRows.length; rIdx++) {
        const row = sheetDataRows[rIdx];
        const nameVal =
          (nameCol ? row[nameCol] : undefined) || findValue(row, NAME_CANDIDATES);
        const cardVal = findValue(row, CARD_ID_CANDIDATES);
        const timeVal = findValue(row, TIME_GENERIC_CANDIDATES);
        const dateVal = findValue(row, DATE_CANDIDATES);
        const doorVal = findValue(row, ['puerta', 'door', 'acceso']);
        const explVal = findValue(row, ['explicacion', 'evento', 'motivo', 'dispositivo']);
        const deptVal = findValue(row, DEPT_CANDIDATES);

        // If completely empty row
        if (!nameVal && !cardVal && !timeVal && !dateVal) {
          totalSkippedEmptyRows++;
          continue;
        }

        let employeeName = nameVal ? String(nameVal).trim().replace(/\s+/g, ' ') : '';
        if (!employeeName && cardVal) {
          employeeName = `Tarjeta #${String(cardVal).trim()}`;
        }
        if (!employeeName) {
          employeeName = `Colaborador Fila ${rIdx + 1}`;
        }

        recognizedEmployeesSet.add(employeeName);

        // Determine date
        let dateStr = overrideDate;
        if (!dateStr && dateVal) {
          dateStr = normalizeDateString(dateVal);
        }
        if (!dateStr && timeVal) {
          dateStr = normalizeDateString(timeVal);
        }
        if (!dateStr || dateStr.length < 8) {
          dateStr = lastSeenDateInSheet;
        } else {
          lastSeenDateInSheet = dateStr;
        }

        // Determine time
        let timeStr = normalizeTimeString(timeVal);
        if (!timeStr && dateVal && String(dateVal).includes(':')) {
          timeStr = normalizeTimeString(dateVal);
        }
        if (!timeStr) {
          timeStr = '00:00:00';
        }

        punches.push({
          employeeName,
          date: dateStr,
          time: timeStr,
          card: cardVal ? String(cardVal).trim() : '',
          door: doorVal ? String(doorVal).trim() : '',
          explanation: explVal ? String(explVal).trim() : '',
          department: deptVal ? String(deptVal).trim() : 'Operaciones Opeconca',
          site: sheetSite,
        });
      }

      // Group punches by employeeName + date
      const grouped = new Map<string, PunchEvent[]>();
      for (const punch of punches) {
        const groupKey = `${punch.employeeName}___${punch.date}`;
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey)!.push(punch);
      }

      // Process each person-day group
      grouped.forEach((groupPunches, key) => {
        const [employeeName, date] = key.split('___');
        // Sort punches by time
        groupPunches.sort((a, b) => a.time.localeCompare(b.time));

        const earliestTime = groupPunches[0].time;
        const latestTime = groupPunches[groupPunches.length - 1].time;

        const calc = calculateAttendanceHours(
          earliestTime === '00:00:00' && groupPunches.length === 1 ? '' : earliestTime,
          latestTime === '00:00:00' && groupPunches.length === 1 ? '' : latestTime
        );

        allRecords.push({
          id: `ope_${employeeName.replace(/[^a-zA-Z0-9]/g, '')}_${date}_${Math.random().toString(36).slice(2, 6)}`,
          employeeName,
          department: groupPunches[0].department,
          site: groupPunches[0].site,
          date,
          earliestTime: earliestTime || 'Sin registro',
          latestTime: latestTime || 'Sin registro',
          isNeutralCase: calc.isNeutralCase,
          grossHours: calc.grossHours,
          lunchDeductionHours: calc.lunchDeductionHours,
          netHours: calc.netHours,
          scheduledHours: calc.scheduledHours,
          varianceHours: calc.varianceHours,
          status: calc.status,
          sourceFile: fileName,
          notes: calc.isNeutralCase
            ? 'Marcación única registrada (Caso Neutral)'
            : `${groupPunches.length} marcaciones registradas`,
        });
      });
    } else {
      // FORMAT 2, 3, or Generic Tabular Format (one row per employee per day)
      for (let rIdx = 0; rIdx < sheetDataRows.length; rIdx++) {
        const row = sheetDataRows[rIdx];

        const dateVal = findValue(row, DATE_CANDIDATES);
        const cardVal = findValue(row, CARD_ID_CANDIDATES);
        const deptVal = findValue(row, DEPT_CANDIDATES);
        const siteVal = findValue(row, SITE_CANDIDATES);

        // Employee Name Extraction
        let employeeName = '';
        const fnVal = firstNameCol ? row[firstNameCol] : undefined;
        const lnVal = lastNameCol ? row[lastNameCol] : undefined;

        if (fnVal && lnVal && firstNameCol !== lastNameCol) {
          employeeName = `${String(lnVal).trim()} ${String(fnVal).trim()}`.replace(/\s+/g, ' ');
        } else {
          const directName =
            (nameCol ? row[nameCol] : undefined) || findValue(row, NAME_CANDIDATES);
          if (directName) {
            employeeName = String(directName).trim().replace(/\s+/g, ' ');
          } else if (cardVal) {
            employeeName = `Colaborador Ficha #${String(cardVal).trim()}`;
          }
        }

        // Punch Times Extraction
        const earlyVal = findValue(row, TIME_EARLY_CANDIDATES);
        const lateVal = findValue(row, TIME_LATE_CANDIDATES);
        const genericTimeVal = findValue(row, TIME_GENERIC_CANDIDATES);

        // If completely empty row (no name, no card, no times, no dates)
        if (!employeeName && !earlyVal && !lateVal && !dateVal && !genericTimeVal) {
          totalSkippedEmptyRows++;
          continue;
        }

        if (!employeeName) {
          employeeName = `Colaborador Fila ${rIdx + 1}`;
        }

        recognizedEmployeesSet.add(employeeName);

        // Date resolution
        const parsedDate = normalizeDateString(dateVal);
        const date = overrideDate || parsedDate || lastSeenDateInSheet;
        if (parsedDate && parsedDate.length >= 8) {
          lastSeenDateInSheet = parsedDate;
        }

        // Department & Site resolution
        const department = deptVal ? String(deptVal).trim() : 'General';
        const site = siteVal ? String(siteVal).trim() : sheetSite;

        // Time resolution (supports UNEFA numeric HHMMSS and standard strings)
        let earliestTime = '';
        let latestTime = '';

        if (sheetFormatInfo.format === 'UNEFA') {
          earliestTime = parseUnefaTime(earlyVal || genericTimeVal);
          latestTime = parseUnefaTime(lateVal || (earlyVal ? '' : genericTimeVal));
        } else {
          earliestTime = normalizeTimeString(earlyVal || genericTimeVal);
          latestTime = normalizeTimeString(lateVal || (earlyVal ? '' : genericTimeVal));
        }

        const calc = calculateAttendanceHours(earliestTime, latestTime);

        let note = undefined;
        if (!earliestTime && !latestTime) {
          note = 'Sin marcaciones registradas en el archivo (Registrado en nómina)';
        } else if (calc.isNeutralCase) {
          note = 'Marcación única registrada (Caso Neutral)';
        }

        allRecords.push({
          id: `rec_${employeeName.replace(/[^a-zA-Z0-9]/g, '')}_${date}_${Math.random().toString(36).slice(2, 6)}`,
          employeeName,
          department,
          site,
          date,
          earliestTime: earliestTime || 'Sin registro',
          latestTime: latestTime || 'Sin registro',
          isNeutralCase: calc.isNeutralCase,
          grossHours: calc.grossHours,
          lunchDeductionHours: calc.lunchDeductionHours,
          netHours: calc.netHours,
          scheduledHours: calc.scheduledHours,
          varianceHours: calc.varianceHours,
          status: calc.status,
          sourceFile: fileName,
          notes: note,
        });
      }
    }
  }

  if (allRecords.length === 0) {
    throw new Error(
      `No se encontraron colaboradores ni filas de asistencia en las hojas del archivo "${fileName}".`
    );
  }

  // Sort records by date descending, then employee name ascending
  allRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.employeeName.localeCompare(b.employeeName);
  });

  // Calculate audit data
  const employeeList = Array.from(recognizedEmployeesSet).sort();
  const neutralCount = allRecords.filter((r) => r.isNeutralCase).length;
  const statusSummary = {
    cumplidos: allRecords.filter((r) => r.status === 'CUMPLIDO' && !r.isNeutralCase).length,
    superavit: allRecords.filter((r) => r.status === 'SUPERAVIT' && !r.isNeutralCase).length,
    deficit: allRecords.filter((r) => r.status === 'DEFICIT' && !r.isNeutralCase).length,
    neutral: neutralCount,
  };

  const audit: ParseAudit = {
    fileName: fileName,
    sheetName: processedSheetNames.join(', ') || 'Hoja 1',
    sheetNames: processedSheetNames,
    totalRawRows: totalRawRowsCount,
    headerRowIndex: primaryHeaderRowIndex,
    validRecordsCount: allRecords.length,
    uniqueEmployeesCount: employeeList.length,
    neutralCasesCount: neutralCount,
    skippedEmptyRows: totalSkippedEmptyRows,
    detectedColumns: Array.from(detectedColumnsAcrossSheets),
    employeeList,
    statusSummary,
  };

  return {
    format: primaryFormat,
    records: allRecords,
    fileName: fileName,
    rowCount: allRecords.length,
    formatDescription: `${primaryDescription} (${processedSheetNames.length} hoja${processedSheetNames.length > 1 ? 's' : ''})`,
    siteName: primarySiteName,
    audit,
  };
}

/**
 * Direct main-thread parser for synchronous or fallback parsing.
 */
export async function parseExcelFileDirect(
  file: File,
  overrideDate?: string,
  overrideSite?: string
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  return parseExcelArrayBuffer(arrayBuffer, file.name, overrideDate, overrideSite);
}

/**
 * Parses an Excel file using an asynchronous dedicated Web Worker off the main thread.
 * Keeps the main UI responsive, smooth, and unblocked even with large biometric datasets.
 */
export async function parseExcelFile(
  file: File,
  overrideDate?: string,
  overrideSite?: string
): Promise<ParseResult> {
  return parseExcelWithWorker(file, overrideDate, overrideSite);
}
