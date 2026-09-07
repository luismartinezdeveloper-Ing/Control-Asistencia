import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Download,
  Printer,
  FileSpreadsheet,
  Building2,
  Users,
  Award,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import {
  AttendanceRecord,
  EmployeeSummary,
  SiteSummary,
} from '../types/attendance';
import {
  computeEmployeeSummaries,
  computeSiteSummaries,
} from '../utils/sampleData';
import { exportMonthlyExcel, exportDetailedAttendanceExcel } from '../utils/excelExporter';

interface MonthlyReportViewProps {
  records: AttendanceRecord[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ records }) => {
  // Extract all months present in records
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        months.add(r.date.slice(0, 7)); // YYYY-MM
      }
    });
    const list = Array.from(months).sort().reverse();
    return list.length > 0 ? list : ['2026-09'];
  }, [records]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || '2026-09'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Month labels in Spanish
  const monthLabels: Record<string, string> = {
    '01': 'Enero',
    '02': 'Febrero',
    '03': 'Marzo',
    '04': 'Abril',
    '05': 'Mayo',
    '06': 'Junio',
    '07': 'Julio',
    '08': 'Agosto',
    '09': 'Septiembre',
    '10': 'Octubre',
    '11': 'Noviembre',
    '12': 'Diciembre',
  };

  const formattedMonthTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const mName = monthLabels[m] || m;
    return `${mName} ${y}`;
  }, [selectedMonth]);

  // Records belonging exclusively to the selected month
  const monthRecords = useMemo(() => {
    return records.filter((r) => r.date && r.date.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  // Summaries derived for this month
  const monthEmployeeSummaries: EmployeeSummary[] = useMemo(() => {
    return computeEmployeeSummaries(monthRecords);
  }, [monthRecords]);

  const monthSiteSummaries: SiteSummary[] = useMemo(() => {
    return computeSiteSummaries(monthRecords);
  }, [monthRecords]);

  // Month global stats
  const monthStats = useMemo(() => {
    const totalDaysRecorded = new Set(monthRecords.map((r) => r.date)).size;
    const totalEmployees = monthEmployeeSummaries.length;
    const totalNetHours = Number(
      monthRecords.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0).toFixed(2)
    );
    const totalScheduledHours = Number(
      monthRecords.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.scheduledHours), 0).toFixed(2)
    );
    const totalGrossHours = Number(
      monthRecords.reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.grossHours), 0).toFixed(2)
    );
    const varianceHours = Number((totalNetHours - totalScheduledHours).toFixed(2));
    const complianceRate = totalScheduledHours > 0 ? (totalNetHours / totalScheduledHours) * 100 : 100;
    const totalNeutral = monthRecords.filter((r) => r.isNeutralCase).length;

    const optimumCount = monthEmployeeSummaries.filter((e) => e.complianceRate >= 100).length;
    const deficitCount = monthEmployeeSummaries.filter((e) => e.status === 'EN_DEFICIT').length;

    return {
      totalDaysRecorded,
      totalEmployees,
      totalNetHours,
      totalGrossHours,
      totalScheduledHours,
      varianceHours,
      complianceRate,
      totalNeutral,
      optimumCount,
      deficitCount,
    };
  }, [monthRecords, monthEmployeeSummaries]);

  // Filtered employee summaries
  const filteredEmployees = useMemo(() => {
    return monthEmployeeSummaries.filter((emp) => {
      const matchesSearch =
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = siteFilter === 'ALL' || emp.site === siteFilter;
      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [monthEmployeeSummaries, searchQuery, siteFilter, statusFilter]);

  const [showMonthlyExportDropdown, setShowMonthlyExportDropdown] = useState(false);
  const monthlyExportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthlyExportRef.current && !monthlyExportRef.current.contains(event.target as Node)) {
        setShowMonthlyExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = () => {
    if (monthRecords.length === 0) return;
    exportMonthlyExcel(
      formattedMonthTitle,
      monthRecords,
      monthEmployeeSummaries,
      monthSiteSummaries
    );
  };

  const handleExportDetailedExcel = () => {
    if (monthRecords.length === 0) return;
    exportDetailedAttendanceExcel(monthRecords, {
      customFileName: `Reporte_Asistencia_${selectedMonth}.xlsx`,
      dateLabel: formattedMonthTitle,
      sheetName: 'Reporte_Asistencia',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="monthly-report-view" className="space-y-6">
      {/* Header & Month Controls */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79]">
              <CalendarDays className="w-5 h-5 text-[#1F4E79]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Reporte Mensual Consolidado
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditoría ejecutiva de cumplimiento, balance de horas netas y reporte consolidado para {formattedMonthTitle}.
          </p>
        </div>

        {/* Month Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => {
                const [y, mon] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {monthLabels[mon] || mon} {y}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Monthly Export Split Button */}
          <div className="relative" ref={monthlyExportRef}>
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                type="button"
                onClick={handleExportDetailedExcel}
                disabled={monthRecords.length === 0}
                className={`px-3.5 py-2 rounded-l-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  monthRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Descargar reporte detallado de asistencia mensual"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar a Excel</span>
                <Download className="w-3.5 h-3.5 opacity-80" />
              </button>
              <button
                type="button"
                onClick={() => setShowMonthlyExportDropdown(!showMonthlyExportDropdown)}
                disabled={monthRecords.length === 0}
                className={`px-2 py-2 rounded-r-lg border-l border-emerald-700/60 transition-all cursor-pointer flex items-center justify-center ${
                  monthRecords.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Más opciones de descarga mensual"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMonthlyExportDropdown ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown Options */}
            {showMonthlyExportDropdown && monthRecords.length > 0 && (
              <div className="absolute right-0 mt-2 w-76 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 text-xs animation-fade-in">
                <div className="px-3 py-1 border-b border-slate-100 mb-1">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Descarga Mensual
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMonthlyExportDropdown(false);
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
                      12 columnas con marcaciones, almuerzo (1.5h), horas netas y balance del mes completo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMonthlyExportDropdown(false);
                    handleExportExcel();
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-start gap-2.5 cursor-pointer group mt-1"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 text-xs">Excel Mensual Consolidado (3 Hojas)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Resumen Ejecutivo, Nómina Consolidada y Registros Detallados.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
            title="Imprimir reporte mensual"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly KPIs Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Días con Registro
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {monthStats.totalDaysRecorded}
          </span>
          <span className="text-[10px] text-slate-500">Jornadas computadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Colaboradores
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {monthStats.totalEmployees}
          </span>
          <span className="text-[10px] text-slate-500">Evaluados en el mes</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Netas Mensuales
          </span>
          <span className="text-xl font-bold text-[#1F4E79] mt-1 block">
            {monthStats.totalNetHours}h
          </span>
          <span className="text-[10px] text-slate-500">Efectivas acumuladas</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Horas Programadas
          </span>
          <span className="text-xl font-bold text-slate-700 mt-1 block">
            {monthStats.totalScheduledHours}h
          </span>
          <span className="text-[10px] text-slate-500">Base exigible (8h/día)</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cumplimiento Mensual
          </span>
          <span
            className={`text-xl font-bold mt-1 block ${
              monthStats.complianceRate >= 100 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {monthStats.complianceRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">
            {monthStats.optimumCount} en meta / {monthStats.deficitCount} en déficit
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Balance Neto Mensual
          </span>
          <span
            className={`text-xl font-bold mt-1 block ${
              monthStats.varianceHours >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {monthStats.varianceHours >= 0 ? `+${monthStats.varianceHours}h` : `${monthStats.varianceHours}h`}
          </span>
          <span className="text-[10px] text-slate-500">
            {monthStats.totalNeutral} casos neutrales
          </span>
        </div>
      </div>

      {/* Sites Performance Summary Cards for the Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monthSiteSummaries.map((site) => (
          <div
            key={site.site}
            className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1F4E79] uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#1F4E79]" />
                <span>{site.site}</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  site.complianceRate >= 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {site.complianceRate.toFixed(1)}% Cumpl.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs my-2">
              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">Personal:</span>
                <span className="font-bold text-slate-800">{site.totalEmployees} colaboradores</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">Jornadas:</span>
                <span className="font-bold text-slate-800">{site.totalRecords} registros</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">Horas Netas:</span>
                <span className="font-bold text-[#1F4E79]">{site.totalNetHours}h</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">Balance:</span>
                <span
                  className={`font-bold ${
                    site.varianceHours >= 0 ? 'text-blue-700' : 'text-red-700'
                  }`}
                >
                  {site.varianceHours >= 0 ? `+${site.varianceHours}h` : `${site.varianceHours}h`}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-right">
              {site.neutralCases} casos neutrales (sin penalizar)
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Collaborator Ranking & Audit Table */}
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
              {monthSiteSummaries.map((s) => (
                <option key={s.site} value={s.site}>
                  {s.site}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OPTIMO">Óptimo (Cumplimiento 100%+)</option>
              <option value="EN_DEFICIT">En Déficit</option>
              <option value="CON_OBSERVACION">Con Observación</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1F4E79] text-white uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3">Departamento</th>
                <th className="py-2.5 px-3 text-center">Días Asist.</th>
                <th className="py-2.5 px-3 text-center">Días Válidos</th>
                <th className="py-2.5 px-3 text-center">Casos Neutr.</th>
                <th className="py-2.5 px-3 text-right">Horas Brutas</th>
                <th className="py-2.5 px-3 text-right font-bold">Horas Netas</th>
                <th className="py-2.5 px-3 text-right">Programadas</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-center">% Cumpl.</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  return (
                    <tr key={emp.employeeName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {emp.employeeName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {emp.site}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {emp.totalDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {emp.validDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {emp.neutralDays > 0 ? (
                          <span className="text-amber-700 font-semibold">{emp.neutralDays}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {emp.totalGrossHours.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F4E79]">
                        {emp.totalNetHours.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {emp.totalScheduledHours.toFixed(2)}h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {emp.varianceHours > 0 ? (
                          <span className="text-emerald-700 font-bold">+{emp.varianceHours.toFixed(2)}h</span>
                        ) : emp.varianceHours < 0 ? (
                          <span className="text-red-700 font-bold">{emp.varianceHours.toFixed(2)}h</span>
                        ) : (
                          <span className="text-slate-600">0.00h</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={emp.complianceRate >= 100 ? 'text-emerald-700' : 'text-amber-700'}
                        >
                          {emp.complianceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'OPTIMO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : emp.status === 'EN_DEFICIT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {emp.status === 'OPTIMO'
                            ? 'Óptimo'
                            : emp.status === 'EN_DEFICIT'
                            ? 'En Déficit'
                            : 'Observación'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No se encontraron colaboradores para el mes {formattedMonthTitle} con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Mostrando {filteredEmployees.length} colaboradores en {formattedMonthTitle}</span>
          <span className="italic">
            Cálculo mensual oficial: 8.00 horas exigibles por cada día laboral válido
          </span>
        </div>
      </div>
    </div>
  );
};
