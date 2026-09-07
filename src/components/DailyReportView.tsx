import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Search,
  Filter,
  Users,
  Building,
  Layers,
  ArrowRight,
  Info,
  CalendarDays,
  UserX,
  FileCheck2,
  Edit3,
  ShieldCheck,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types/attendance';
import { exportDailyExcel, exportDetailedAttendanceExcel } from '../utils/excelExporter';
import { AbsenceJustificationModal } from './AbsenceJustificationModal';
import { SCHEDULED_DAILY_HOURS } from '../utils/timeUtils';

interface DailyReportViewProps {
  records: AttendanceRecord[];
  onUpdateRecords?: (records: AttendanceRecord[], message?: string) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  records,
  onUpdateRecords,
}) => {
  // Extract all unique dates present in records sorted descending
  const availableDates = useMemo(() => {
    const set = new Set(records.map((r) => r.date).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [records]);

  // Selected date: defaults to latest date or 'ALL' if preferred
  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0] || new Date().toISOString().slice(0, 10)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal state for absence justification
  const [isJustificationModalOpen, setIsJustificationModalOpen] = useState<boolean>(false);
  const [selectedRecordForJustification, setSelectedRecordForJustification] =
    useState<AttendanceRecord | null>(null);
  const [initialDataForAbsence, setInitialDataForAbsence] = useState<{
    employeeName: string;
    department?: string;
    site?: string;
    date: string;
  } | null>(null);

  // Dropdown state for Daily export
  const [showDailyExportDropdown, setShowDailyExportDropdown] = useState(false);
  const dailyExportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dailyExportRef.current && !dailyExportRef.current.contains(event.target as Node)) {
        setShowDailyExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If availableDates changes and current selectedDate is not in it and not 'ALL', pick the first
  React.useEffect(() => {
    if (
      selectedDate !== 'ALL' &&
      availableDates.length > 0 &&
      !availableDates.includes(selectedDate)
    ) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const isAllDates = selectedDate === 'ALL';

  // Records for selected day or all dates
  const dayRecords = useMemo(() => {
    if (isAllDates) return records;
    return records.filter((r) => r.date === selectedDate);
  }, [records, selectedDate, isAllDates]);

  // All known sites across the entire dataset
  const allKnownSites = useMemo(() => {
    const set = new Set(records.map((r) => r.site).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  // Master roster of all employees ever seen in the system
  const masterRoster = useMemo(() => {
    const map = new Map<string, { employeeName: string; department: string; site: string }>();
    records.forEach((r) => {
      if (!r.employeeName) return;
      if (!map.has(r.employeeName)) {
        map.set(r.employeeName, {
          employeeName: r.employeeName,
          department: r.department || 'General',
          site: r.site || 'Oficina Opeconca',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [records]);

  // Employees who belong to the master roster but have NO record at all on this date
  const missingEmployeesOnDay = useMemo(() => {
    if (isAllDates) return [];
    const presentNames = new Set(dayRecords.map((r) => r.employeeName));
    return masterRoster.filter((emp) => {
      const isPresent = presentNames.has(emp.employeeName);
      const matchesSite = siteFilter === 'ALL' || emp.site === siteFilter;
      return !isPresent && matchesSite;
    });
  }, [masterRoster, dayRecords, isAllDates, siteFilter]);

  // Map of date to list of sites present on that date
  const dateSitesSummaryMap = useMemo(() => {
    const map = new Map<string, { sites: string[]; count: number }>();
    records.forEach((r) => {
      if (!r.date) return;
      const entry = map.get(r.date) || { sites: [], count: 0 };
      if (r.site && !entry.sites.includes(r.site)) {
        entry.sites.push(r.site);
      }
      entry.count++;
      map.set(r.date, entry);
    });
    return map;
  }, [records]);

  // Map of each site to the dates it has records for
  const siteDatesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    records.forEach((r) => {
      if (!r.site || !r.date) return;
      const list = map.get(r.site) || [];
      if (!list.includes(r.date)) {
        list.push(r.date);
        map.set(r.site, list);
      }
    });
    return map;
  }, [records]);

  // Sede stats for current selection
  const siteBreakdownOnDay = useMemo(() => {
    const map = new Map<
      string,
      {
        site: string;
        employees: Set<string>;
        totalRecords: number;
        netHours: number;
        scheduledHours: number;
        neutralCount: number;
        superavitCount: number;
        deficitCount: number;
        cumplidoCount: number;
        absenceCount: number;
        justifiedCount: number;
      }
    >();

    dayRecords.forEach((r) => {
      const siteName = r.site || 'Sin Sede';
      if (!map.has(siteName)) {
        map.set(siteName, {
          site: siteName,
          employees: new Set<string>(),
          totalRecords: 0,
          netHours: 0,
          scheduledHours: 0,
          neutralCount: 0,
          superavitCount: 0,
          deficitCount: 0,
          cumplidoCount: 0,
          absenceCount: 0,
          justifiedCount: 0,
        });
      }
      const item = map.get(siteName)!;
      item.employees.add(r.employeeName);
      item.totalRecords++;

      if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
        item.absenceCount++;
        item.deficitCount++;
        item.scheduledHours += r.scheduledHours || SCHEDULED_DAILY_HOURS;
      } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
        item.justifiedCount++;
        item.neutralCount++;
      } else if (r.isNeutralCase) {
        item.neutralCount++;
      } else {
        item.netHours += r.netHours;
        item.scheduledHours += r.scheduledHours;
        if (r.status === 'SUPERAVIT') item.superavitCount++;
        else if (r.status === 'DEFICIT') item.deficitCount++;
        else if (r.status === 'CUMPLIDO') item.cumplidoCount++;
      }
    });

    return Array.from(map.values()).map((item) => {
      const netHours = Number(item.netHours.toFixed(2));
      const scheduledHours = Number(item.scheduledHours.toFixed(2));
      const variance = Number((netHours - scheduledHours).toFixed(2));
      const compliance = scheduledHours > 0 ? (netHours / scheduledHours) * 100 : 100;
      return {
        ...item,
        uniqueEmployeesCount: item.employees.size,
        netHours,
        scheduledHours,
        variance,
        compliance,
      };
    });
  }, [dayRecords]);

  // Filtered day records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return dayRecords.filter((rec) => {
      const matchesSearch =
        !q ||
        rec.employeeName.toLowerCase().includes(q) ||
        rec.department.toLowerCase().includes(q) ||
        rec.site.toLowerCase().includes(q) ||
        rec.date.toLowerCase().includes(q) ||
        (rec.notes && rec.notes.toLowerCase().includes(q)) ||
        (rec.justificationReason && rec.justificationReason.toLowerCase().includes(q));
      const matchesSite = siteFilter === 'ALL' || rec.site === siteFilter;
      const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [dayRecords, searchQuery, siteFilter, statusFilter]);

  // KPIs for the selected day / selection
  const dayStats = useMemo(() => {
    const totalEmployees = new Set(dayRecords.map((r) => r.employeeName)).size;
    let totalNetHours = 0;
    let totalGrossHours = 0;
    let totalLunchDeduction = 0;
    let totalScheduledHours = 0;
    let superavitCount = 0;
    let deficitCount = 0;
    let cumplidoCount = 0;
    let neutralCount = 0;
    let absenceCount = 0;
    let justifiedCount = 0;

    dayRecords.forEach((r) => {
      if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
        absenceCount++;
        deficitCount++;
        totalScheduledHours += r.scheduledHours || SCHEDULED_DAILY_HOURS;
      } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
        justifiedCount++;
        neutralCount++;
      } else if (r.isNeutralCase) {
        neutralCount++;
      } else {
        totalNetHours += r.netHours;
        totalGrossHours += r.grossHours;
        totalLunchDeduction += r.lunchDeductionHours;
        totalScheduledHours += r.scheduledHours;
        if (r.status === 'SUPERAVIT') superavitCount++;
        else if (r.status === 'DEFICIT') deficitCount++;
        else if (r.status === 'CUMPLIDO') cumplidoCount++;
      }
    });

    totalNetHours = Number(totalNetHours.toFixed(2));
    totalGrossHours = Number(totalGrossHours.toFixed(2));
    totalLunchDeduction = Number(totalLunchDeduction.toFixed(2));
    totalScheduledHours = Number(totalScheduledHours.toFixed(2));
    const varianceHours = Number((totalNetHours - totalScheduledHours).toFixed(2));
    const complianceRate = totalScheduledHours > 0 ? (totalNetHours / totalScheduledHours) * 100 : 100;

    return {
      totalEmployees,
      totalNetHours,
      totalGrossHours,
      totalLunchDeduction,
      totalScheduledHours,
      varianceHours,
      complianceRate,
      superavitCount,
      deficitCount,
      cumplidoCount,
      neutralCount,
      absenceCount,
      justifiedCount,
    };
  }, [dayRecords]);

  const handleExportExcel = () => {
    if (dayRecords.length === 0) return;
    exportDailyExcel(selectedDate, dayRecords);
  };

  const handleExportDetailedExcel = () => {
    if (dayRecords.length === 0) return;
    exportDetailedAttendanceExcel(dayRecords, {
      customFileName: `Reporte_Asistencia_${isAllDates ? 'Historico' : selectedDate}.xlsx`,
      dateLabel: isAllDates ? 'Historico' : selectedDate,
      sheetName: 'Reporte_Asistencia',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Handler for saving from AbsenceJustificationModal
  const handleSaveAbsenceRecord = (updatedRecord: AttendanceRecord, message: string) => {
    const exists = records.some((r) => r.id === updatedRecord.id);
    let newRecords: AttendanceRecord[];
    if (exists) {
      newRecords = records.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
    } else {
      newRecords = [...records, updatedRecord];
    }

    if (onUpdateRecords) {
      onUpdateRecords(newRecords, message);
    }
  };

  // Mark single missing roster employee as unjustified absence (-8h)
  const handleMarkSingleMissingAsAbsence = (emp: {
    employeeName: string;
    department: string;
    site: string;
  }) => {
    const newRecord: AttendanceRecord = {
      id: `absence-${emp.employeeName.replace(/\s+/g, '_')}-${selectedDate}-${Date.now()}`,
      employeeName: emp.employeeName,
      department: emp.department,
      site: emp.site,
      date: selectedDate,
      earliestTime: '-',
      latestTime: '-',
      grossHours: 0,
      lunchDeductionHours: 0,
      netHours: 0,
      scheduledHours: SCHEDULED_DAILY_HOURS,
      varianceHours: -SCHEDULED_DAILY_HOURS,
      status: 'INASISTENCIA',
      isNeutralCase: false,
      isAbsence: true,
      isJustified: false,
      sourceFile: 'Registro_Inasistencia_Manual',
      notes: 'Inasistencia no justificada (Día no asistido)',
    };

    if (onUpdateRecords) {
      onUpdateRecords(
        [...records, newRecord],
        `Inasistencia registrada para ${emp.employeeName} el ${selectedDate} (-8.00h de déficit).`
      );
    }
  };

  // Batch mark all missing roster employees on the selected date as unjustified absence
  const handleBatchMarkMissingAsAbsence = () => {
    if (missingEmployeesOnDay.length === 0) return;

    const newAbsenceRecords: AttendanceRecord[] = missingEmployeesOnDay.map((emp) => ({
      id: `absence-${emp.employeeName.replace(/\s+/g, '_')}-${selectedDate}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      employeeName: emp.employeeName,
      department: emp.department,
      site: emp.site,
      date: selectedDate,
      earliestTime: '-',
      latestTime: '-',
      grossHours: 0,
      lunchDeductionHours: 0,
      netHours: 0,
      scheduledHours: SCHEDULED_DAILY_HOURS,
      varianceHours: -SCHEDULED_DAILY_HOURS,
      status: 'INASISTENCIA',
      isNeutralCase: false,
      isAbsence: true,
      isJustified: false,
      sourceFile: 'Registro_Inasistencia_Manual',
      notes: 'Inasistencia no justificada (Día no asistido)',
    }));

    if (onUpdateRecords) {
      onUpdateRecords(
        [...records, ...newAbsenceRecords],
        `Se registraron ${newAbsenceRecords.length} inasistencias para la fecha ${selectedDate}.`
      );
    }
  };

  const activeSiteRecordCountOnDay =
    siteFilter === 'ALL'
      ? dayRecords.length
      : dayRecords.filter((r) => r.site === siteFilter).length;

  const siteDatesForActiveFilter = siteFilter !== 'ALL' ? siteDatesMap.get(siteFilter) || [] : [];

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Banner with Date Picker & Export Action */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79]">
              <Calendar className="w-5 h-5 text-[#1F4E79]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Reporte Diario de Asistencia e Inasistencias
            </h2>
            {isAllDates && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#1F4E79] text-xs font-bold">
                Consolidado Multisede (Todas las Fechas)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspecciona la jornada laboral por sede, horas netas (-1.5h almuerzo) y gestiona ausencias con o sin justificación legal.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fecha:</span>
            {availableDates.length > 0 ? (
              <select
                id="daily-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[220px] sm:max-w-xs truncate"
              >
                <option value="ALL">
                  ★ Todas las fechas ({records.length} reg. - Todas las sedes)
                </option>
                {availableDates.map((d) => {
                  const summary = dateSitesSummaryMap.get(d);
                  const sitesText = summary?.sites.join(', ') || 'Sede';
                  return (
                    <option key={d} value={d}>
                      {d} • {sitesText} ({summary?.count || 0} reg.)
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            )}
          </div>

          {/* Quick Absence / Justification Action */}
          <button
            type="button"
            onClick={() => {
              setSelectedRecordForJustification(null);
              setInitialDataForAbsence({
                employeeName: masterRoster[0]?.employeeName || '',
                department: masterRoster[0]?.department || 'General',
                site: masterRoster[0]?.site || 'Oficina Opeconca',
                date: isAllDates ? availableDates[0] || new Date().toISOString().slice(0, 10) : selectedDate,
              });
              setIsJustificationModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer"
            title="Registrar o justificar inasistencia para la fecha"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>+ Registrar Inasistencia / Justificación</span>
          </button>

          {/* Daily Export Split Button */}
          <div className="relative" ref={dailyExportRef}>
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                type="button"
                onClick={handleExportDetailedExcel}
                disabled={dayRecords.length === 0}
                className={`px-3 py-1.5 rounded-l-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  dayRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Descargar reporte detallado de asistencia en Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar a Excel</span>
                <Download className="w-3 h-3 opacity-80" />
              </button>
              <button
                type="button"
                onClick={() => setShowDailyExportDropdown(!showDailyExportDropdown)}
                disabled={dayRecords.length === 0}
                className={`px-2 py-1.5 rounded-r-lg border-l border-emerald-700/60 transition-all cursor-pointer flex items-center justify-center ${
                  dayRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Más opciones de descarga"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDailyExportDropdown ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown Options */}
            {showDailyExportDropdown && dayRecords.length > 0 && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 text-xs animation-fade-in">
                <div className="px-3 py-1 border-b border-slate-100 mb-1">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Descarga de Asistencia
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDailyExportDropdown(false);
                    handleExportDetailedExcel();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-xs">Reporte Detallado de Asistencia</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">Recomendado</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Estructura de 12 columnas con marcaciones, almuerzo (1.5h), horas netas y balance.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDailyExportDropdown(false);
                    handleExportExcel();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-start gap-2.5 cursor-pointer group mt-1"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 text-xs">Excel Diario Estándar</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Formato detallado con desglose de permanencia, almuerzo y balance.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
            title="Imprimir vista"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sede Selector Navigation Pills */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#1F4E79]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filtrar por Sede
            </span>
            <span className="text-[11px] text-slate-500">
              ({allKnownSites.length} sedes registradas en el sistema)
            </span>
          </div>
          {siteFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSiteFilter('ALL')}
              className="text-xs text-[#1F4E79] hover:underline font-semibold self-start sm:self-auto cursor-pointer"
            >
              Restablecer a Todas las Sedes
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Button: Todas las Sedes */}
          <button
            type="button"
            onClick={() => setSiteFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              siteFilter === 'ALL'
                ? 'bg-[#1F4E79] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas las Sedes</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                siteFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {dayRecords.length}
            </span>
          </button>

          {/* Button for each detected Sede */}
          {allKnownSites.map((siteName) => {
            const countOnSelected = dayRecords.filter((r) => r.site === siteName).length;
            const totalInSystem = records.filter((r) => r.site === siteName).length;
            const isSelected = siteFilter === siteName;

            return (
              <button
                key={siteName}
                type="button"
                onClick={() => setSiteFilter(siteName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1F4E79] text-white border-[#1F4E79] shadow-sm'
                    : countOnSelected > 0
                    ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    : 'bg-amber-50/60 text-amber-900 border-amber-200 hover:bg-amber-100/60'
                }`}
              >
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span>{siteName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : countOnSelected > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-200 text-amber-800'
                  }`}
                  title={
                    countOnSelected > 0
                      ? `${countOnSelected} colaboradores en esta fecha`
                      : `0 en esta fecha (${totalInSystem} en otras fechas)`
                  }
                >
                  {countOnSelected > 0 ? `${countOnSelected}` : `0 / ${totalInSystem}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notice when selected Sede has 0 records on the current date */}
        {siteFilter !== 'ALL' && activeSiteRecordCountOnDay === 0 && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  La sede &quot;{siteFilter}&quot; no tiene registros cargados para la fecha seleccionada ({selectedDate}).
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Esta sede cuenta con {siteDatesForActiveFilter.length} fecha(s) registrada(s):{' '}
                  <span className="font-semibold">{siteDatesForActiveFilter.slice(0, 5).join(', ')}</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {siteDatesForActiveFilter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(siteDatesForActiveFilter[0])}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Ir a fecha {siteDatesForActiveFilter[0]}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDate('ALL')}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Ver Todas las Fechas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Missing Roster Employees on the Selected Date Detection Banner */}
      {!isAllDates && missingEmployeesOnDay.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                <UserX className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  <span>Colaboradores de la Plantilla sin Marcación en esta Fecha ({missingEmployeesOnDay.length})</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                    Requiere Resolución
                  </span>
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Regla institucional: Si un colaborador no asistió, debe quedar marcado como{' '}
                  <strong>Inasistencia (-8.00h déficit)</strong> o contar con su <strong>Justificación (reposo, permiso)</strong> para eximir el débito.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBatchMarkMissingAsAbsence}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Marcar a todos los no registrados de esta fecha como Inasistencia no justificada (-8h)"
              >
                <UserX className="w-3 h-3" />
                <span>Marcar Todos como Inasistencia (-8h)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {missingEmployeesOnDay.map((emp) => (
              <div
                key={emp.employeeName}
                className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block text-xs">{emp.employeeName}</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {emp.site} • {emp.department}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMarkSingleMissingAsAbsence(emp)}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                    title="Marcar como Inasistencia injustificada (-8h)"
                  >
                    Inasistencia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecordForJustification(null);
                      setInitialDataForAbsence({
                        employeeName: emp.employeeName,
                        department: emp.department,
                        site: emp.site,
                        date: selectedDate,
                      });
                      setIsJustificationModalOpen(true);
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Justificar con reposo o permiso"
                  >
                    <FileCheck2 className="w-3 h-3" />
                    <span>Justificar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily KPIs Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Colaboradores
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {dayStats.totalEmployees}
          </span>
          <span className="text-[10px] text-slate-500">Registrados en jornada</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Netas
          </span>
          <span className="text-xl font-bold text-[#1F4E79] mt-1 block">
            {dayStats.totalNetHours}h
          </span>
          <span className="text-[10px] text-slate-500">Post-almuerzo (-1.5h)</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Programadas
          </span>
          <span className="text-xl font-bold text-slate-700 mt-1 block">
            {dayStats.totalScheduledHours}h
          </span>
          <span className="text-[10px] text-slate-500">Exigible (8.0h/persona)</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cumplimiento
          </span>
          <span
            className={`text-xl font-bold mt-1 block ${
              dayStats.complianceRate >= 100 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {dayStats.complianceRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">Tasa de jornada</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Inasistencias (Faltas)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold ${dayStats.absenceCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {dayStats.absenceCount}
            </span>
            {dayStats.absenceCount > 0 && (
              <span className="text-[10px] font-bold text-rose-600">
                (-{(dayStats.absenceCount * 8).toFixed(0)}h)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">Sin justificar</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Justificados / N
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-700">
              {dayStats.justifiedCount}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">
              (+{dayStats.neutralCount - dayStats.justifiedCount} N)
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Eximidos de déficit</span>
        </div>
      </div>

      {/* Multi-Sede Breakdown Bento for Current Date/Selection */}
      {siteBreakdownOnDay.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1F4E79]" />
              <span>Desglose por Sedes en la Jornada ({siteBreakdownOnDay.length} activas)</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {isAllDates ? 'Consolidado de todas las fechas' : `Fecha: ${selectedDate}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {siteBreakdownOnDay.map((s) => (
              <div
                key={s.site}
                onClick={() => setSiteFilter(s.site === siteFilter ? 'ALL' : s.site)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  siteFilter === s.site
                    ? 'border-[#1F4E79] bg-blue-50/50 ring-2 ring-[#1F4E79]/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#1F4E79]" />
                    {s.site}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.compliance >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {s.compliance.toFixed(1)}% cumplimiento
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Personal</span>
                    <span className="font-bold text-slate-800">{s.uniqueEmployeesCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Horas Netas</span>
                    <span className="font-bold text-[#1F4E79]">{s.netHours}h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Diferencia</span>
                    <span
                      className={`font-bold ${
                        s.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {s.variance >= 0 ? `+${s.variance}h` : `${s.variance}h`}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {s.totalRecords} reg.
                    {s.absenceCount > 0 && (
                      <span className="text-rose-600 font-bold ml-1.5">
                        • {s.absenceCount} inasistencia(s)
                      </span>
                    )}
                  </span>
                  <span className="text-[#1F4E79] font-medium hover:underline text-[10px]">
                    {siteFilter === s.site ? 'Ver todos' : 'Filtrar esta sede →'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar colaborador, motivo, sede..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Todas las Sedes ({dayRecords.length})</option>
              {allKnownSites.map((s) => {
                const countOnDay = dayRecords.filter((r) => r.site === s).length;
                return (
                  <option key={s} value={s}>
                    {s} ({countOnDay} en fecha)
                  </option>
                );
              })}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="CUMPLIDO">Cumplido (8.0h)</option>
              <option value="SUPERAVIT">Superávit (&gt;8.0h)</option>
              <option value="DEFICIT">Déficit (&lt;8.0h)</option>
              <option value="INASISTENCIA">Inasistencia (Falta -8h)</option>
              <option value="JUSTIFICADO">Justificado (Permiso / Reposo)</option>
              <option value="NEUTRAL">Caso Neutral / Incompleto</option>
            </select>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1F4E79] text-white uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                {isAllDates && <th className="py-2.5 px-3">Fecha</th>}
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Sede / Ubicación</th>
                <th className="py-2.5 px-3">Departamento</th>
                <th className="py-2.5 px-3 text-center">Hora Entrada</th>
                <th className="py-2.5 px-3 text-center">Hora Salida</th>
                <th className="py-2.5 px-3 text-right">Perm. Bruta</th>
                <th className="py-2.5 px-3 text-right">Almuerzo</th>
                <th className="py-2.5 px-3 text-right font-bold">Horas Netas</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-center">Acción / Justificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {isAllDates && (
                        <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">
                          {rec.date}
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {rec.employeeName}
                        {rec.justificationReason && (
                          <span className="block text-[10px] font-semibold text-emerald-700">
                            ✓ {rec.justificationReason}
                            {rec.justificationDocument ? ` (${rec.justificationDocument})` : ''}
                          </span>
                        )}
                        {rec.notes && !rec.justificationReason && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            {rec.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            rec.site.includes('Opeconca')
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : rec.site.includes('Nalys')
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : rec.site.includes('UNEFA')
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <Building className="w-3 h-3" />
                          {rec.site}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="text-[11px] text-slate-700">{rec.department || 'General'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {rec.earliestTime || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {rec.latestTime || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {rec.status === 'INASISTENCIA' || rec.status === 'JUSTIFICADO' || rec.isNeutralCase
                          ? '-'
                          : `${rec.grossHours.toFixed(2)}h`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {rec.status === 'INASISTENCIA' || rec.status === 'JUSTIFICADO' || rec.isNeutralCase
                          ? '-'
                          : `-${rec.lunchDeductionHours.toFixed(2)}h`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F4E79]">
                        {rec.status === 'INASISTENCIA' || rec.status === 'JUSTIFICADO' || rec.isNeutralCase
                          ? '0.00h'
                          : `${rec.netHours.toFixed(2)}h`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {rec.status === 'INASISTENCIA' ? (
                          <span className="text-rose-700 font-extrabold">-8.00h</span>
                        ) : rec.status === 'JUSTIFICADO' || rec.isNeutralCase ? (
                          <span className="text-slate-400">0.00h</span>
                        ) : rec.varianceHours > 0 ? (
                          <span className="text-emerald-700 font-semibold">+{rec.varianceHours.toFixed(2)}h</span>
                        ) : rec.varianceHours < 0 ? (
                          <span className="text-red-700 font-semibold">{rec.varianceHours.toFixed(2)}h</span>
                        ) : (
                          <span className="text-slate-600">0.00h</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'INASISTENCIA'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold'
                              : rec.status === 'JUSTIFICADO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
                              : rec.status === 'SUPERAVIT'
                              ? 'bg-blue-100 text-blue-800'
                              : rec.status === 'DEFICIT'
                              ? 'bg-red-100 text-red-800'
                              : rec.status === 'NEUTRAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec.status === 'INASISTENCIA'
                            ? 'Inasistencia'
                            : rec.status === 'JUSTIFICADO'
                            ? 'Justificado'
                            : rec.status === 'SUPERAVIT'
                            ? 'Superávit'
                            : rec.status === 'DEFICIT'
                            ? 'Déficit'
                            : rec.status === 'NEUTRAL'
                            ? 'Caso Neutral'
                            : 'Cumplido'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {rec.status === 'INASISTENCIA' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordForJustification(rec);
                              setIsJustificationModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 mx-auto cursor-pointer shadow-xs"
                            title="Presentar soporte y justificar inasistencia"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Justificar</span>
                          </button>
                        ) : rec.status === 'JUSTIFICADO' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordForJustification(rec);
                              setIsJustificationModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                            title="Ver detalles o editar justificativo"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            <span>Ver / Editar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordForJustification(rec);
                              setIsJustificationModalOpen(true);
                            }}
                            className="text-[11px] text-slate-500 hover:text-[#1F4E79] hover:bg-slate-100 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                            title="Modificar o justificar ausencia"
                          >
                            Gestionar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAllDates ? 12 : 11} className="py-8 text-center text-slate-400">
                    No se encontraron registros para la selección aplicada ({selectedDate}, sede:{' '}
                    {siteFilter}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>
            Mostrando {filteredRecords.length} de {dayRecords.length} registros{' '}
            {isAllDates ? '(Consolidado General)' : `del día ${selectedDate}`}
          </span>
          <span className="italic">
            Deducción estándar de almuerzo: 1.50 horas automáticas por colaborador en jornada laboral
          </span>
        </div>
      </div>

      {/* Absence & Justification Management Modal */}
      <AbsenceJustificationModal
        isOpen={isJustificationModalOpen}
        onClose={() => {
          setIsJustificationModalOpen(false);
          setSelectedRecordForJustification(null);
          setInitialDataForAbsence(null);
        }}
        record={selectedRecordForJustification}
        initialData={initialDataForAbsence}
        onSaveAbsence={handleSaveAbsenceRecord}
      />
    </div>
  );
};
