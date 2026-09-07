import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Download,
  Printer,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Users,
  ChevronDown,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { exportWeeklyExcel, exportDetailedAttendanceExcel } from '../utils/excelExporter';

interface WeeklyReportViewProps {
  records: AttendanceRecord[];
}

interface WeekOption {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({ records }) => {
  // Discover months in the records
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        months.add(r.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [records]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || '2026-09'
  );

  // Generate 5 calendar weeks for the chosen month
  const weekOptions: WeekOption[] = useMemo(() => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: WeekOption[] = [
      {
        id: 'w1',
        label: `Semana 1 (Días 01 - 07)`,
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-07`,
      },
      {
        id: 'w2',
        label: `Semana 2 (Días 08 - 14)`,
        startDate: `${selectedMonth}-08`,
        endDate: `${selectedMonth}-14`,
      },
      {
        id: 'w3',
        label: `Semana 3 (Días 15 - 21)`,
        startDate: `${selectedMonth}-15`,
        endDate: `${selectedMonth}-21`,
      },
      {
        id: 'w4',
        label: `Semana 4 (Días 22 - 28)`,
        startDate: `${selectedMonth}-22`,
        endDate: `${selectedMonth}-28`,
      },
    ];

    if (daysInMonth > 28) {
      weeks.push({
        id: 'w5',
        label: `Semana 5 (Días 29 - ${daysInMonth})`,
        startDate: `${selectedMonth}-29`,
        endDate: `${selectedMonth}-${daysInMonth.toString().padStart(2, '0')}`,
      });
    }

    return weeks;
  }, [selectedMonth]);

  const [selectedWeekId, setSelectedWeekId] = useState<string>('w1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');

  const currentWeek = useMemo(() => {
    return weekOptions.find((w) => w.id === selectedWeekId) || weekOptions[0];
  }, [weekOptions, selectedWeekId]);

  // Filter records within the selected week range
  const weekRecords = useMemo(() => {
    if (!currentWeek) return [];
    return records.filter(
      (r) => r.date >= currentWeek.startDate && r.date <= currentWeek.endDate
    );
  }, [records, currentWeek]);

  // Unique dates in the week
  const weekDates = useMemo(() => {
    const dates = new Set<string>();
    if (!currentWeek) return [];
    const [startY, startM, startD] = currentWeek.startDate.split('-').map(Number);
    const [, , endD] = currentWeek.endDate.split('-').map(Number);

    for (let d = startD; d <= endD; d++) {
      const dateStr = `${startY}-${startM.toString().padStart(2, '0')}-${d
        .toString()
        .padStart(2, '0')}`;
      dates.add(dateStr);
    }
    return Array.from(dates).sort();
  }, [currentWeek]);

  // Distinct sites in the week
  const availableSites = useMemo(() => {
    return Array.from(new Set(weekRecords.map((r) => r.site)));
  }, [weekRecords]);

  // Matrix aggregated by employee
  const employeeMatrix = useMemo(() => {
    const map = new Map<
      string,
      {
        employeeName: string;
        site: string;
        department: string;
        dailyHours: Record<string, { netHours: number; isNeutral: boolean; status: string }>;
        totalNetHours: number;
        totalScheduledHours: number;
        daysPresent: number;
      }
    >();

    weekRecords.forEach((rec) => {
      if (!map.has(rec.employeeName)) {
        map.set(rec.employeeName, {
          employeeName: rec.employeeName,
          site: rec.site,
          department: rec.department,
          dailyHours: {},
          totalNetHours: 0,
          totalScheduledHours: 0,
          daysPresent: 0,
        });
      }

      const item = map.get(rec.employeeName)!;
      item.dailyHours[rec.date] = {
        netHours: rec.netHours,
        isNeutral: rec.isNeutralCase,
        status: rec.status,
      };

      if (!rec.isNeutralCase) {
        item.totalNetHours += rec.netHours;
        item.totalScheduledHours += rec.scheduledHours;
      }
      item.daysPresent += 1;
    });

    const list = Array.from(map.values()).map((emp) => {
      const net = Number(emp.totalNetHours.toFixed(2));
      const sched = Number(emp.totalScheduledHours.toFixed(2));
      const variance = Number((net - sched).toFixed(2));
      const compliance = sched > 0 ? (net / sched) * 100 : 100;

      let status: 'OPTIMO' | 'DEFICIT' | 'SUPERAVIT' = 'OPTIMO';
      if (variance < -0.1) status = 'DEFICIT';
      else if (variance > 0.1) status = 'SUPERAVIT';

      return {
        ...emp,
        net,
        sched,
        variance,
        compliance,
        status,
      };
    });

    list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return list;
  }, [weekRecords]);

  // Filtered employee matrix
  const filteredMatrix = useMemo(() => {
    return employeeMatrix.filter((emp) => {
      const matchesSearch =
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = siteFilter === 'ALL' || emp.site === siteFilter;
      return matchesSearch && matchesSite;
    });
  }, [employeeMatrix, searchQuery, siteFilter]);

  // Global KPIs for the week
  const weekStats = useMemo(() => {
    const totalEmployees = employeeMatrix.length;
    const totalNetHours = Number(
      employeeMatrix.reduce((acc, e) => acc + e.net, 0).toFixed(2)
    );
    const totalScheduledHours = Number(
      employeeMatrix.reduce((acc, e) => acc + e.sched, 0).toFixed(2)
    );
    const varianceHours = Number((totalNetHours - totalScheduledHours).toFixed(2));
    const complianceRate =
      totalScheduledHours > 0 ? (totalNetHours / totalScheduledHours) * 100 : 100;

    const daysWithData = new Set(weekRecords.map((r) => r.date)).size;

    return {
      totalEmployees,
      totalNetHours,
      totalScheduledHours,
      varianceHours,
      complianceRate,
      daysWithData,
    };
  }, [employeeMatrix, weekRecords]);

  const [showWeeklyExportDropdown, setShowWeeklyExportDropdown] = useState(false);
  const weeklyExportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (weeklyExportRef.current && !weeklyExportRef.current.contains(event.target as Node)) {
        setShowWeeklyExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = () => {
    if (weekRecords.length === 0 || !currentWeek) return;
    exportWeeklyExcel(
      currentWeek.label,
      currentWeek.startDate,
      currentWeek.endDate,
      weekRecords
    );
  };

  const handleExportDetailedExcel = () => {
    if (weekRecords.length === 0 || !currentWeek) return;
    exportDetailedAttendanceExcel(weekRecords, {
      customFileName: `Reporte_Asistencia_${currentWeek.startDate}_al_${currentWeek.endDate}.xlsx`,
      dateLabel: `${currentWeek.startDate} al ${currentWeek.endDate}`,
      sheetName: 'Reporte_Asistencia',
    });
  };

  const getDayName = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return names[dateObj.getDay()];
  };

  return (
    <div id="weekly-report-view" className="space-y-6">
      {/* Header & Week Controls */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79]">
              <CalendarRange className="w-5 h-5 text-[#1F4E79]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Reporte Semanal de Asistencia
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolida las horas de la semana, visualiza la matriz día a día por colaborador y evalúa el balance neto acumulado.
          </p>
        </div>

        {/* Week Selector & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Semana:</span>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {weekOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weekly Export Split Button */}
          <div className="relative" ref={weeklyExportRef}>
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                type="button"
                onClick={handleExportDetailedExcel}
                disabled={weekRecords.length === 0}
                className={`px-3 py-1.5 rounded-l-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  weekRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Descargar reporte detallado de asistencia de la semana"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar a Excel</span>
                <Download className="w-3 h-3 opacity-80" />
              </button>
              <button
                type="button"
                onClick={() => setShowWeeklyExportDropdown(!showWeeklyExportDropdown)}
                disabled={weekRecords.length === 0}
                className={`px-2 py-1.5 rounded-r-lg border-l border-emerald-700/60 transition-all cursor-pointer flex items-center justify-center ${
                  weekRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Más opciones de descarga semanal"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWeeklyExportDropdown ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown Options */}
            {showWeeklyExportDropdown && weekRecords.length > 0 && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 text-xs animation-fade-in">
                <div className="px-3 py-1 border-b border-slate-100 mb-1">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Descarga Semanal
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowWeeklyExportDropdown(false);
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
                      12 columnas con marcaciones, almuerzo (1.5h), horas netas y balance de la semana.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowWeeklyExportDropdown(false);
                    handleExportExcel();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-start gap-2.5 cursor-pointer group mt-1"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 text-xs">Excel Semanal Matricial</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Matriz de días Lun-Dom por colaborador con totales y balance semanal.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly KPIs Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Colaboradores
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {weekStats.totalEmployees}
          </span>
          <span className="text-[10px] text-slate-500">Activos en la semana</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Días con Datos
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {weekStats.daysWithData}
          </span>
          <span className="text-[10px] text-slate-500">Jornadas computadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Netas Semanales
          </span>
          <span className="text-xl font-bold text-[#1F4E79] mt-1 block">
            {weekStats.totalNetHours}h
          </span>
          <span className="text-[10px] text-slate-500">Total neto acumulado</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Programadas
          </span>
          <span className="text-xl font-bold text-slate-700 mt-1 block">
            {weekStats.totalScheduledHours}h
          </span>
          <span className="text-[10px] text-slate-500">Base exigible</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cumplimiento Semanal
          </span>
          <span
            className={`text-xl font-bold mt-1 block ${
              weekStats.complianceRate >= 100 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {weekStats.complianceRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">Tasa de la semana</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Balance Semanal
          </span>
          <span
            className={`text-xl font-bold mt-1 block ${
              weekStats.varianceHours >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {weekStats.varianceHours >= 0 ? `+${weekStats.varianceHours}h` : `${weekStats.varianceHours}h`}
          </span>
          <span className="text-[10px] text-slate-500">
            {weekStats.varianceHours >= 0 ? 'Superávit semanal' : 'Déficit semanal'}
          </span>
        </div>
      </div>

      {/* Matrix Table by Collaborator */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar colaborador o departamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">Todas las Sedes</option>
              {availableSites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matrix */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1F4E79] text-white uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Sede</th>
                {weekDates.map((dateStr) => {
                  const dayNum = dateStr.split('-')[2];
                  const dayName = getDayName(dateStr);
                  return (
                    <th key={dateStr} className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div>{dayName}</div>
                      <div className="text-[9px] opacity-80">{dayNum}</div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-right font-bold">Total Netas</th>
                <th className="py-2.5 px-3 text-right">Programadas</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-center">% Cumpl.</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMatrix.length > 0 ? (
                filteredMatrix.map((emp) => {
                  return (
                    <tr key={emp.employeeName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {emp.employeeName}
                        <span className="block text-[10px] font-normal text-slate-400">{emp.department}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {emp.site}
                      </td>

                      {/* Days of the week */}
                      {weekDates.map((dateStr) => {
                        const dayInfo = emp.dailyHours[dateStr];
                        if (!dayInfo) {
                          return (
                            <td key={dateStr} className="py-2.5 px-2 text-center text-slate-300 font-mono">
                              -
                            </td>
                          );
                        }

                        if (dayInfo.isNeutral) {
                          return (
                            <td key={dateStr} className="py-2.5 px-2 text-center" title="Caso Neutral / Incompleto">
                              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                                Neut.
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={dateStr} className="py-2.5 px-2 text-center font-mono">
                            <span
                              className={`text-[11px] font-semibold ${
                                dayInfo.netHours >= 8.0 ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {dayInfo.netHours.toFixed(1)}h
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F4E79]">
                        {emp.net.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {emp.sched.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {emp.variance > 0 ? (
                          <span className="text-emerald-700 font-bold">+{emp.variance.toFixed(2)}h</span>
                        ) : emp.variance < 0 ? (
                          <span className="text-red-700 font-bold">{emp.variance.toFixed(2)}h</span>
                        ) : (
                          <span className="text-slate-600">0.00h</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold">
                        <span
                          className={emp.compliance >= 100 ? 'text-emerald-700' : 'text-amber-700'}
                        >
                          {emp.compliance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'SUPERAVIT'
                              ? 'bg-blue-100 text-blue-800'
                              : emp.status === 'DEFICIT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {emp.status === 'SUPERAVIT'
                            ? 'Superávit'
                            : emp.status === 'DEFICIT'
                            ? 'Déficit'
                            : 'Óptimo'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={weekDates.length + 7} className="py-8 text-center text-slate-400">
                    No se encontraron registros en el período {currentWeek?.label}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Mostrando {filteredMatrix.length} colaboradores en {currentWeek?.label}</span>
          <span className="italic">Horas netas diarias calculadas descontando 1.50h fijas de almuerzo</span>
        </div>
      </div>
    </div>
  );
};
