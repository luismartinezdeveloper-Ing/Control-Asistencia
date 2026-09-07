import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  Eye,
  ShieldCheck,
  Check,
  Briefcase,
} from 'lucide-react';
import {
  AttendanceRecord,
  EmployeeSummary,
  LoadedFileMeta,
} from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';
import * as XLSX from 'xlsx';

interface EmployeesRosterViewProps {
  employeeSummaries: EmployeeSummary[];
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  onSelectEmployee?: (employeeName: string) => void;
}

export const EmployeesRosterView: React.FC<EmployeesRosterViewProps> = ({
  employeeSummaries,
  records,
  loadedFiles,
  onSelectEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedFile, setSelectedFile] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [verificationQuery, setVerificationQuery] = useState('');

  // Map each employee to the source files they appear in
  const employeeSourceFilesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    records.forEach((r) => {
      if (!map.has(r.employeeName)) {
        map.set(r.employeeName, new Set());
      }
      if (r.sourceFile) {
        map.get(r.employeeName)!.add(r.sourceFile);
      }
    });
    return map;
  }, [records]);

  // Unique sites
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    employeeSummaries.forEach((emp) => {
      if (emp.site) set.add(emp.site);
    });
    return Array.from(set).sort();
  }, [employeeSummaries]);

  // File breakdown with employee count
  const fileBreakdown = useMemo(() => {
    return loadedFiles.map((file) => {
      const employeesInFile = new Set<string>();
      records.forEach((r) => {
        if (r.sourceFile === file.name) {
          employeesInFile.add(r.employeeName);
        }
      });
      return {
        fileName: file.name,
        format: file.format,
        employeesCount: employeesInFile.size || file.uniqueEmployeesCount || 0,
        recordsCount: file.recordsCount,
      };
    });
  }, [loadedFiles, records]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employeeSummaries.filter((emp) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = emp.employeeName.toLowerCase().includes(term);
        const matchDept = emp.department.toLowerCase().includes(term);
        const matchSite = emp.site.toLowerCase().includes(term);
        if (!matchName && !matchDept && !matchSite) return false;
      }

      // Site filter
      if (selectedSite !== 'ALL' && emp.site !== selectedSite) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus !== emp.status) return false;
      }

      // File filter
      if (selectedFile !== 'ALL') {
        const files = employeeSourceFilesMap.get(emp.employeeName);
        if (!files || !files.has(selectedFile)) return false;
      }

      return true;
    });
  }, [employeeSummaries, searchTerm, selectedSite, selectedStatus, selectedFile, employeeSourceFilesMap]);

  // Verification check results
  const verificationResult = useMemo(() => {
    if (!verificationQuery.trim()) return null;
    const query = verificationQuery.toLowerCase().trim();
    const matches = employeeSummaries.filter((e) =>
      e.employeeName.toLowerCase().includes(query)
    );
    return matches;
  }, [verificationQuery, employeeSummaries]);

  // Export Roster to Excel
  const handleExportRoster = () => {
    const data = filteredEmployees.map((emp, index) => {
      const sourceFiles = Array.from(employeeSourceFilesMap.get(emp.employeeName) || []).join('; ');
      return {
        'N°': index + 1,
        'Colaborador': emp.employeeName,
        'Sede': emp.site,
        'Departamento': emp.department,
        'Días Totales': emp.totalDays,
        'Días Válidos': emp.validDays,
        'Días Neutrales': emp.neutralDays,
        'Horas Brutas': emp.totalGrossHours.toFixed(2),
        'Horas Netas': emp.totalNetHours.toFixed(2),
        'Horas Programadas': emp.totalScheduledHours.toFixed(2),
        'Diferencia (Horas)': formatVariance(emp.varianceHours),
        'Tasa de Cumplimiento (%)': `${emp.complianceRate.toFixed(1)}%`,
        'Estado': emp.status === 'OPTIMO' ? 'Óptimo' : emp.status === 'EN_DEFICIT' ? 'Déficit' : 'Con Observación',
        'Archivos de Origen': sourceFiles,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nomina_Colaboradores');
    XLSX.writeFile(wb, `Nomina_Consolidada_Colaboradores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="employees-roster-view" className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-100 text-[#1F4E79] shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Padrón Completo de Colaboradores
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {employeeSummaries.length} Colaboradores Extraídos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {records.length} Jornadas Registradas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Auditoría nominal exhaustiva de todas las personas identificadas en todos los archivos Excel cargados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportRoster}
            className="px-4 py-2.5 bg-[#1F4E79] hover:bg-[#163857] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap self-start lg:self-center"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Descargar Padrón Excel (.xlsx)</span>
          </button>
        </div>

        {/* Source Files Breakdown Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F4E79]" />
            <span>Colaboradores Detectados por Archivo de Origen:</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFile('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                selectedFile === 'ALL'
                  ? 'bg-[#1F4E79] text-white border-[#1F4E79]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>Todos los archivos</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[11px]">
                {employeeSummaries.length}
              </span>
            </button>

            {fileBreakdown.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedFile(selectedFile === f.fileName ? 'ALL' : f.fileName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
                  selectedFile === f.fileName
                    ? 'bg-[#1F4E79] text-white border-[#1F4E79]'
                    : 'bg-white hover:bg-blue-50/60 text-slate-700 border-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate max-w-[180px]">{f.fileName}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  {f.employeesCount} pers.
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Verification Search Callout */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#1F4E79] flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4" />
              <span>Verificador Rápido de Inclusión Nominal</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Escribe el nombre o apellido de cualquier persona para confirmar al instante si está en los Excel cargados.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ej: Pérez, Juan, Andrea, etc..."
              value={verificationQuery}
              onChange={(e) => setVerificationQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white text-xs rounded-xl border border-blue-200 focus:border-[#1F4E79] focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-2xs"
            />
            {verificationQuery && (
              <button
                type="button"
                onClick={() => setVerificationQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Verification result popout */}
        {verificationQuery.trim() !== '' && (
          <div className="mt-3 pt-3 border-t border-blue-200/60">
            {verificationResult && verificationResult.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Se encontraron {verificationResult.length} coincidencia(s) en la nómina cargada:
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {verificationResult.map((match, idx) => {
                    const files = Array.from(employeeSourceFilesMap.get(match.employeeName) || []);
                    return (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {match.employeeName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1F4E79]">
                              {match.site}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {match.department} • {match.totalDays} día(s) registrado(s)
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1 truncate">
                            <FileSpreadsheet className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{files.join(', ') || 'Archivo Excel'}</span>
                          </p>
                        </div>
                        {onSelectEmployee && (
                          <button
                            type="button"
                            onClick={() => onSelectEmployee(match.employeeName)}
                            className="mt-2 text-[11px] font-bold text-[#1F4E79] hover:underline flex items-center gap-1"
                          >
                            <span>Ver ficha individual</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No se encontró ningún colaborador con el término "{verificationQuery}". Revisa si está escrito con otra ortografía o si está en otra sede.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nombre o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-[#1F4E79] outline-none transition-all"
              />
            </div>

            {/* Sede selector */}
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 text-xs rounded-xl border border-slate-200 focus:border-[#1F4E79] outline-none transition-all cursor-pointer font-medium"
            >
              <option value="ALL">Todas las Sedes ({employeeSummaries.length})</option>
              {availableSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 text-xs rounded-xl border border-slate-200 focus:border-[#1F4E79] outline-none transition-all cursor-pointer font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OPTIMO">Óptimo (Superávit / Cumplido)</option>
              <option value="CON_OBSERVACION">Con Observación</option>
              <option value="EN_DEFICIT">En Déficit</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end md:self-center">
            Mostrando <span className="font-bold text-slate-800">{filteredEmployees.length}</span> de{' '}
            <span className="font-bold text-slate-800">{employeeSummaries.length}</span> colaboradores
          </div>
        </div>

        {/* Master Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 w-12 text-center">N°</th>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3">Departamento</th>
                <th className="py-2.5 px-3 text-center">Días Reg.</th>
                <th className="py-2.5 px-3 text-right">Horas Netas</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3">Archivos Fuente</th>
                <th className="py-2.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, index) => {
                  const sourceFiles = Array.from(
                    employeeSourceFilesMap.get(emp.employeeName) || []
                  );
                  return (
                    <tr
                      key={emp.employeeName}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-2 px-3 text-center font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-[#1F4E79] transition-colors">
                          {emp.employeeName}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          {emp.site}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{emp.department}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="font-bold text-slate-800">{emp.totalDays}</span>
                        {emp.neutralDays > 0 && (
                          <span className="text-[10px] text-amber-600 ml-1">
                            ({emp.neutralDays} neutral)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatHours(emp.totalNetHours)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            emp.varianceHours > 0.05
                              ? 'text-emerald-600'
                              : emp.varianceHours < -0.05
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }
                        >
                          {formatVariance(emp.varianceHours)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'OPTIMO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : emp.status === 'CON_OBSERVACION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {emp.status === 'OPTIMO'
                            ? 'Óptimo'
                            : emp.status === 'CON_OBSERVACION'
                            ? 'Observación'
                            : 'Déficit'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {sourceFiles.map((sf, i) => (
                            <span
                              key={i}
                              title={sf}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[#1F4E79] text-[10px] font-medium truncate max-w-[140px] border border-blue-100"
                            >
                              <FileSpreadsheet className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{sf}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {onSelectEmployee && (
                          <button
                            type="button"
                            onClick={() => onSelectEmployee(emp.employeeName)}
                            className="p-1 text-slate-400 hover:text-[#1F4E79] hover:bg-blue-100/60 rounded-md transition-colors cursor-pointer"
                            title="Ver ficha individual"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron colaboradores con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
