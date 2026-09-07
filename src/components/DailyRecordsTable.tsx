import React, { useState, useMemo } from 'react';
import {
  Table,
  Search,
  Filter,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  UserX,
  FileCheck2,
  Edit3,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';
import { AbsenceJustificationModal } from './AbsenceJustificationModal';

interface DailyRecordsTableProps {
  records: AttendanceRecord[];
  onUpdateRecord?: (updatedRecord: AttendanceRecord, message?: string) => void;
}

export const DailyRecordsTable: React.FC<DailyRecordsTableProps> = ({
  records,
  onUpdateRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Modal state
  const [selectedRecordForJustification, setSelectedRecordForJustification] =
    useState<AttendanceRecord | null>(null);
  const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);

  // Available sites
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.site));
    return Array.from(set);
  }, [records]);

  // Helper to normalize search query without accents
  const normalize = (text: string) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search term
      if (searchTerm.trim()) {
        const term = normalize(searchTerm.trim());
        const matchName = normalize(r.employeeName).includes(term);
        const matchDept = normalize(r.department).includes(term);
        const matchSite = normalize(r.site).includes(term);
        const matchFile = normalize(r.sourceFile || '').includes(term);
        const matchDate = r.date.includes(term);
        const matchReason = normalize(r.justificationReason || '').includes(term);
        if (!matchName && !matchDept && !matchSite && !matchFile && !matchDate && !matchReason) return false;
      }

      // Site filter
      if (siteFilter !== 'ALL' && r.site !== siteFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'INASISTENCIA' && (r.status !== 'INASISTENCIA' && !(r.isAbsence && !r.isJustified))) return false;
        if (statusFilter === 'JUSTIFICADO' && (r.status !== 'JUSTIFICADO' && !(r.isAbsence && r.isJustified))) return false;
        if (statusFilter === 'NEUTRAL' && !r.isNeutralCase) return false;
        if (statusFilter === 'CUMPLIDO' && (r.status !== 'CUMPLIDO' || r.isNeutralCase)) return false;
        if (statusFilter === 'SUPERAVIT' && (r.status !== 'SUPERAVIT' || r.isNeutralCase)) return false;
        if (statusFilter === 'DEFICIT' && (r.status !== 'DEFICIT' || r.isNeutralCase)) return false;
      }

      return true;
    });
  }, [records, searchTerm, siteFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSaveAbsence = (updatedRec: AttendanceRecord, msg: string) => {
    if (onUpdateRecord) {
      onUpdateRecord(updatedRec, msg);
    }
  };

  return (
    <section
      id="daily-records-section"
      className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
          <Table className="w-4 h-4 text-[#1F4E79]" />
          <span>Registro Diario Consolidado de Asistencia e Inasistencias</span>
        </h2>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-xs rounded-lg border border-gray-300 focus:border-[#1F4E79] outline-none transition-all"
            />
          </div>

          {/* Sede selector */}
          <select
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-xs rounded-lg border border-gray-300 focus:border-[#1F4E79] outline-none text-gray-700 cursor-pointer font-medium"
          >
            <option value="ALL">Todas las Sedes</option>
            {availableSites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-xs rounded-lg border border-gray-300 focus:border-[#1F4E79] outline-none text-gray-700 cursor-pointer font-medium"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="CUMPLIDO">Cumplido (8h netas)</option>
            <option value="SUPERAVIT">Superávit</option>
            <option value="DEFICIT">Déficit</option>
            <option value="INASISTENCIA">Inasistencia (-8h)</option>
            <option value="JUSTIFICADO">Justificado (Exonerado)</option>
            <option value="NEUTRAL">Caso Neutral</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px]">
              <tr>
                <th scope="col" className="px-3 py-2.5">Fecha</th>
                <th scope="col" className="px-3 py-2.5">Colaborador</th>
                <th scope="col" className="px-2.5 py-2.5">Sede</th>
                <th scope="col" className="px-2.5 py-2.5">Entrada</th>
                <th scope="col" className="px-2.5 py-2.5">Salida</th>
                <th scope="col" className="px-2.5 py-2.5 text-right">Perm. Bruta</th>
                <th scope="col" className="px-2.5 py-2.5 text-right">Almuerzo</th>
                <th scope="col" className="px-2.5 py-2.5 text-right">Horas Netas</th>
                <th scope="col" className="px-2.5 py-2.5 text-right">Diferencia</th>
                <th scope="col" className="px-3 py-2.5 text-center">Estado</th>
                <th scope="col" className="px-2.5 py-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400">
                    No se encontraron registros que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                currentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 font-bold text-gray-900 whitespace-nowrap">
                      {r.employeeName}
                      {r.justificationReason && (
                        <span className="block text-[10px] font-semibold text-emerald-700">
                          ✓ {r.justificationReason}
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 border border-gray-200 font-medium">
                        {r.site}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-gray-700 whitespace-nowrap text-[11px]">
                      {r.earliestTime || '--:--'}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-gray-700 whitespace-nowrap text-[11px]">
                      {r.status === 'INASISTENCIA' ? (
                        <span className="text-rose-600 italic">No asistió</span>
                      ) : r.status === 'JUSTIFICADO' ? (
                        <span className="text-emerald-700 italic">Justificado</span>
                      ) : r.isNeutralCase ? (
                        <span className="text-amber-700 italic">Sin salida</span>
                      ) : (
                        r.latestTime || '--:--'
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-gray-600 whitespace-nowrap text-[11px]">
                      {r.status === 'INASISTENCIA' || r.status === 'JUSTIFICADO' || r.isNeutralCase
                        ? '-'
                        : `${r.grossHours.toFixed(2)}h`}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-gray-400 whitespace-nowrap text-[11px]">
                      {r.status === 'INASISTENCIA' || r.status === 'JUSTIFICADO' || r.isNeutralCase
                        ? '-'
                        : `-${r.lunchDeductionHours.toFixed(2)}h`}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {r.status === 'INASISTENCIA' || r.status === 'JUSTIFICADO' || r.isNeutralCase
                        ? '0.00h'
                        : `${r.netHours.toFixed(2)}h`}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap text-[11px]">
                      {r.status === 'INASISTENCIA' ? (
                        <span className="font-extrabold text-rose-700">-8.00h</span>
                      ) : r.status === 'JUSTIFICADO' || r.isNeutralCase ? (
                        <span className="text-gray-400">0.00h</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            r.varianceHours >= 0 ? 'text-green-600' : 'text-rose-600'
                          }`}
                        >
                          {formatVariance(r.varianceHours)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {r.status === 'INASISTENCIA' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Inasistencia
                        </span>
                      )}
                      {r.status === 'JUSTIFICADO' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Justificado
                        </span>
                      )}
                      {r.status === 'NEUTRAL' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Caso Neutral
                        </span>
                      )}
                      {r.status === 'SUPERAVIT' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Superávit
                        </span>
                      )}
                      {r.status === 'CUMPLIDO' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Completo
                        </span>
                      )}
                      {r.status === 'DEFICIT' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Déficit
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-center whitespace-nowrap">
                      {r.status === 'INASISTENCIA' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecordForJustification(r);
                            setIsJustificationModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="Justificar esta falta"
                        >
                          <FileCheck2 className="w-2.5 h-2.5" />
                          <span>Justificar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecordForJustification(r);
                            setIsJustificationModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-[#1F4E79] hover:bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer"
                          title="Gestionar estado o justificar"
                        >
                          Gestionar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 pt-2 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>
            Mostrando{' '}
            <span className="font-bold text-gray-700">
              {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-bold text-gray-700">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{' '}
            de <span className="font-bold text-gray-700">{filteredRecords.length}</span>{' '}
            jornadas
          </span>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 cursor-pointer outline-none"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-gray-700 text-[11px]">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Justification Modal */}
      <AbsenceJustificationModal
        isOpen={isJustificationModalOpen}
        onClose={() => {
          setIsJustificationModalOpen(false);
          setSelectedRecordForJustification(null);
        }}
        record={selectedRecordForJustification}
        onSaveAbsence={handleSaveAbsence}
      />
    </section>
  );
};
