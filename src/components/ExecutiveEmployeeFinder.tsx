import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FileCheck2,
  Clock,
  Eye,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary } from '../types/attendance';

interface ExecutiveEmployeeFinderProps {
  employees: EmployeeSummary[];
  records: AttendanceRecord[];
  onOpenEmployeeModal: (name: string) => void;
  onOpenJustification: (record: AttendanceRecord) => void;
}

export const ExecutiveEmployeeFinder: React.FC<ExecutiveEmployeeFinderProps> = ({
  employees,
  records,
  onOpenEmployeeModal,
  onOpenJustification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<
    'ALL' | 'ABSENCE' | 'JUSTIFIED' | 'DEFICIT' | 'OPTIMAL'
  >('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Reset pagination batch when filters or search change
  React.useEffect(() => {
    setVisibleCount(6);
  }, [searchTerm, selectedSite, filterType]);

  // Build employee cards with latest status
  const employeeDetails = useMemo(() => {
    return employees.map((emp) => {
      const empRecords = records
        .filter((r) => r.employeeName.toLowerCase() === emp.employeeName.toLowerCase())
        .sort((a, b) => b.date.localeCompare(a.date));

      const latestRecord = empRecords[0];
      const hasAbsence = empRecords.some(
        (r) => r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)
      );
      const hasJustified = empRecords.some(
        (r) => r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)
      );

      return {
        ...emp,
        latestRecord,
        hasAbsence,
        hasJustified,
      };
    });
  }, [employees, records]);

  // Extract unique available sites dynamically
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    employeeDetails.forEach((emp) => {
      if (emp.site) set.add(emp.site);
    });
    return Array.from(set).sort();
  }, [employeeDetails]);

  // Filter list
  const filtered = useMemo(() => {
    return employeeDetails.filter((emp) => {
      // Sede Filter
      if (selectedSite !== 'ALL' && emp.site !== selectedSite) {
        return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = emp.employeeName.toLowerCase().includes(term);
        const matchDept = emp.department.toLowerCase().includes(term);
        const matchSite = emp.site.toLowerCase().includes(term);
        if (!matchName && !matchDept && !matchSite) return false;
      }

      // Filter chips
      if (filterType === 'ABSENCE' && !emp.hasAbsence) return false;
      if (filterType === 'JUSTIFIED' && !emp.hasJustified) return false;
      if (filterType === 'DEFICIT' && emp.varianceHours >= 0) return false;
      if (filterType === 'OPTIMAL' && (emp.complianceRate < 95 || emp.hasAbsence)) return false;

      return true;
    });
  }, [employeeDetails, searchTerm, selectedSite, filterType]);

  const visibleCards = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  return (
    <section id="executive-employee-finder" className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1F4E79]" />
            <span>Fichas de Colaboradores (Directorio Ejecutivo)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Consulta rápida del estado de asistencia de cada colaborador en lotes progresivos de 6.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Site Selector */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full md:w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#1F4E79] focus:outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Todas las Sedes ({employeeDetails.length})</option>
              {availableSites.map((site) => (
                <option key={site} value={site}>
                  Sede: {site}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cargo o sede..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#1F4E79] focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Filtro:
        </span>
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-[#1F4E79] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos ({employeeDetails.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('ABSENCE')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'ABSENCE'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Con Inasistencia ({employeeDetails.filter((e) => e.hasAbsence).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('JUSTIFIED')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'JUSTIFIED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Justificados ({employeeDetails.filter((e) => e.hasJustified).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('OPTIMAL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'OPTIMAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Desempeño Óptimo ({employeeDetails.filter((e) => e.complianceRate >= 95 && !e.hasAbsence).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('DEFICIT')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'DEFICIT'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Con Déficit Horas ({employeeDetails.filter((e) => e.varianceHours < 0).length})</span>
        </button>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No se encontraron colaboradores que coincidan con la búsqueda.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleCards.map((emp) => {
            const initials = emp.employeeName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('');

            return (
              <div
                key={emp.employeeName}
                className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-[#1F4E79] rounded-xl p-3.5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#1F4E79] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {emp.employeeName}
                        </h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{emp.site}</span>
                        </p>
                      </div>
                    </div>

                    {emp.hasAbsence ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                        Falta (-8h)
                      </span>
                    ) : emp.hasJustified ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                        Justificado
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.complianceRate >= 95
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {Math.round(emp.complianceRate)}%
                      </span>
                    )}
                  </div>

                  {/* Plain Language Status Note */}
                  <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
                    {emp.latestRecord ? (
                      emp.latestRecord.status === 'INASISTENCIA' ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <UserX className="w-3 h-3" />
                          Último registro ({emp.latestRecord.date}): No asistió
                        </span>
                      ) : emp.latestRecord.status === 'JUSTIFICADO' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3" />
                          Último registro ({emp.latestRecord.date}): Justificado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Última entrada: {emp.latestRecord.earliestTime} ({emp.latestRecord.date})
                        </span>
                      )
                    ) : (
                      <span>Sin marcaciones registradas</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                  <div className="text-[11px]">
                    <span className="text-slate-400">Balance: </span>
                    <strong
                      className={`font-mono ${
                        emp.varianceHours >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {emp.varianceHours >= 0
                        ? `+${emp.varianceHours.toFixed(1)}h`
                        : `${emp.varianceHours.toFixed(1)}h`}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {emp.hasAbsence && emp.latestRecord && (
                      <button
                        type="button"
                        onClick={() => onOpenJustification(emp.latestRecord)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        Justificar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenEmployeeModal(emp.employeeName)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[#1F4E79] rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver Ficha</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Progressive Load Button Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800 font-bold">{visibleCards.length}</strong> de{' '}
              <strong className="text-slate-800 font-bold">{filtered.length}</strong> colaboradores
              {filtered.length > visibleCards.length && (
                <span className="text-slate-400 font-normal ml-1">
                  ({filtered.length - visibleCards.length} restantes)
                </span>
              )}
            </p>

            {visibleCount < filtered.length && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-4 py-2 bg-[#1F4E79] hover:bg-[#153859] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>Ver más colaboradores (+6)</span>
                </button>
                {filtered.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filtered.length)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Mostrar todos ({filtered.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
