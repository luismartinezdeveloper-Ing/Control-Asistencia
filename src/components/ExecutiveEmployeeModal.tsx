import React from 'react';
import {
  X,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  FileCheck2,
  UserX,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary } from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';

interface ExecutiveEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string | null;
  employees: EmployeeSummary[];
  records: AttendanceRecord[];
  onOpenJustification?: (record: AttendanceRecord) => void;
}

export const ExecutiveEmployeeModal: React.FC<ExecutiveEmployeeModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  employees,
  records,
  onOpenJustification,
}) => {
  if (!isOpen || !employeeName) return null;

  const summary = employees.find((e) => e.employeeName.toLowerCase() === employeeName.toLowerCase()) || {
    employeeName,
    site: 'General',
    department: 'Operaciones',
    totalDays: 0,
    validDays: 0,
    neutralDays: 0,
    absenceDays: 0,
    justifiedDays: 0,
    totalGrossHours: 0,
    totalNetHours: 0,
    totalScheduledHours: 0,
    varianceHours: 0,
    complianceRate: 100,
    status: 'OPTIMO',
  };

  const employeeRecords = records
    .filter((r) => r.employeeName.toLowerCase() === employeeName.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date));

  const latestRecord = employeeRecords[0];
  const hasAbsence = employeeRecords.some((r) => r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified));
  const hasJustification = employeeRecords.some((r) => r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified));

  // Determine executive health status
  const healthStatus = hasAbsence
    ? { text: 'Requiere Atención', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' }
    : summary.complianceRate >= 95
    ? { text: 'Desempeño Óptimo', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' }
    : { text: 'En Observación', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Executive Badge */}
        <div className="bg-[#1F4E79] text-white p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
              {employeeName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{employeeName}</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${healthStatus.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${healthStatus.dot}`} />
                  {healthStatus.text}
                </span>
              </div>
              <p className="text-xs text-blue-200 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Building2 className="w-3.5 h-3.5" />
                  {summary.site}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {summary.department || 'Personal Operativo'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Executive 3-Card Summary (No confusing technical jargon) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Días Registrados
              </span>
              <p className="text-xl font-black text-slate-800 mt-0.5">{employeeRecords.length}</p>
              <span className="text-[11px] text-slate-500 font-medium">
                {summary.validDays} completados
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Puntualidad
              </span>
              <p
                className={`text-xl font-black mt-0.5 ${
                  summary.complianceRate >= 95 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {Math.round(summary.complianceRate)}%
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                {summary.complianceRate >= 95 ? 'Excelente' : 'Con desvíos'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Balance de Horas
              </span>
              <p
                className={`text-xl font-black mt-0.5 ${
                  summary.varianceHours >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {summary.varianceHours >= 0
                  ? `+${summary.varianceHours.toFixed(1)}h`
                  : `${summary.varianceHours.toFixed(1)}h`}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                {summary.varianceHours >= 0 ? 'A favor' : 'Déficit acumulado'}
              </span>
            </div>
          </div>

          {/* Current State Indicator */}
          {latestRecord && (
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#1F4E79] text-white">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1F4E79] uppercase tracking-wider block">
                    Último Registro Conocido ({latestRecord.date})
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {latestRecord.status === 'INASISTENCIA' ? (
                      <span className="text-rose-700">Inasistencia sin registrar asistencia</span>
                    ) : latestRecord.status === 'JUSTIFICADO' ? (
                      <span className="text-emerald-700">Justificado: {latestRecord.justificationReason || 'Permiso'}</span>
                    ) : latestRecord.isNeutralCase ? (
                      <span className="text-amber-700">Marcación única: entrada {latestRecord.earliestTime}</span>
                    ) : (
                      <span>
                        Entrada {latestRecord.earliestTime} • Salida {latestRecord.latestTime} ({latestRecord.netHours.toFixed(1)}h netas)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {latestRecord.status === 'INASISTENCIA' && onOpenJustification && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenJustification(latestRecord);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Justificar Falta</span>
                </button>
              )}
            </div>
          )}

          {/* Historial Directivo de Jornadas */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1F4E79]" />
              <span>Resumen de Asistencia por Fecha</span>
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              {employeeRecords.map((r) => (
                <div key={r.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-700">{r.date}</span>
                    <span className="text-slate-400">•</span>
                    {r.status === 'INASISTENCIA' ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                        Inasistencia (-8h)
                      </span>
                    ) : r.status === 'JUSTIFICADO' ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        Justificado: {r.justificationReason}
                      </span>
                    ) : r.isNeutralCase ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium text-[10px]">
                        1 sola marcación
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {r.earliestTime} a {r.latestTime} ({r.netHours.toFixed(1)}h)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        r.varianceHours >= 0
                          ? 'text-emerald-700'
                          : r.varianceHours === 0
                          ? 'text-slate-400'
                          : 'text-rose-700'
                      }`}
                    >
                      {r.varianceHours >= 0 ? `+${r.varianceHours.toFixed(1)}h` : `${r.varianceHours.toFixed(1)}h`}
                    </span>

                    {r.status === 'INASISTENCIA' && onOpenJustification && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenJustification(r);
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] underline cursor-pointer ml-1"
                      >
                        Justificar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1F4E79] hover:bg-[#163857] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
