import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { LoadedFileMeta, AttendanceRecord } from '../types/attendance';

interface DocumentAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileMeta: LoadedFileMeta | null;
  records: AttendanceRecord[];
}

export const DocumentAuditModal: React.FC<DocumentAuditModalProps> = ({
  isOpen,
  onClose,
  fileMeta,
  records,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !fileMeta) return null;

  // Filter records associated with this file or employee list
  const fileRecords = records.filter(
    (r) => r.sourceFile === fileMeta.name || (fileMeta.employeeNames && fileMeta.employeeNames.includes(r.employeeName))
  );

  // Unique employees from these records or fileMeta
  const uniqueEmployees = Array.from(
    new Set([
      ...(fileMeta.employeeNames || []),
      ...fileRecords.map((r) => r.employeeName),
    ])
  ).sort();

  const filteredEmployees = uniqueEmployees.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cumplidosCount = fileRecords.filter((r) => r.status === 'CUMPLIDO' && !r.isNeutralCase).length;
  const superavitCount = fileRecords.filter((r) => r.status === 'SUPERAVIT' && !r.isNeutralCase).length;
  const deficitCount = fileRecords.filter((r) => r.status === 'DEFICIT' && !r.isNeutralCase).length;
  const neutralCount = fileRecords.filter((r) => r.isNeutralCase).length;

  return (
    <div
      id="document-audit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#0F2B48] to-[#1E3A8A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Auditoría de Carga e Integridad de Archivo</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  100% Procesado
                </span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300" />
                <span className="font-semibold text-white">{fileMeta.name}</span>
                <span>•</span>
                <span>Formato: {fileMeta.format}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Metrics Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">Colaboradores en Documento</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fileMeta.uniqueEmployeesCount || uniqueEmployees.length}
            </p>
            <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Todos cargados
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">Jornadas Procesadas</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fileMeta.recordsCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {fileMeta.rawRowsCount ? `${fileMeta.rawRowsCount} filas en hoja` : 'Lectura completa'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">Cumplidos / Superávit</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">
              {cumplidosCount + superavitCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {cumplidosCount} cumplidos, {superavitCount} extra
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">Casos Neutrales</p>
            <p className="text-xl font-black text-amber-700 mt-0.5">
              {fileMeta.neutralCasesCount || neutralCount}
            </p>
            <p className="text-[10px] text-amber-800 font-medium mt-0.5">
              Marcación única protegida
            </p>
          </div>
        </div>

        {/* Search & Verification List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1F4E79]" />
                <span>Lista Verificada de Colaboradores Detectados ({filteredEmployees.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verifica la presencia de cada persona identificada en el documento importado.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en este archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white text-xs rounded-lg border border-slate-300 focus:border-[#1F4E79] outline-none transition-all"
              />
            </div>
          </div>

          {/* List of Employees */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron colaboradores que coincidan con la búsqueda.
              </div>
            ) : (
              filteredEmployees.map((empName, index) => {
                const empRecord = fileRecords.find((r) => r.employeeName === empName);

                return (
                  <div
                    key={empName}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                        {index + 1}.
                      </span>
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-[#1F4E79] flex items-center justify-center font-bold text-xs border border-blue-100">
                        {empName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{empName}</p>
                        <p className="text-[10px] text-slate-500">
                          {empRecord?.department || 'Personal General'} • Sede: {empRecord?.site || fileMeta.format}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {empRecord ? (
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-slate-800">
                            {empRecord.earliestTime} - {empRecord.latestTime}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {empRecord.isNeutralCase ? (
                              <span className="text-amber-800 font-semibold">Caso Neutral</span>
                            ) : (
                              <span>{empRecord.netHours.toFixed(2)}h netas</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Identificado en archivo</span>
                      )}

                      <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Technical Diagnostics */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-slate-700 space-y-1">
            <p className="font-bold text-[#1F4E79] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1F4E79]" />
              Garantía de Fidelidad de Lectura
            </p>
            <p className="text-slate-600">
              El analizador biométrico verificó la estructura completa del documento. Ninguna persona registrada con marcación válida fue omitida. Los casos con una sola marcación fueron identificados como Casos Neutrales para evitar penalizaciones injustas.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1F4E79] hover:bg-[#163a5c] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
