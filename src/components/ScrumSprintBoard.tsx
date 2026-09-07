import React, { useState, useMemo } from 'react';
import {
  Zap,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  UserCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { UserAccount, ScrumSprint } from '../types/auth';
import { formatDateSpanish } from '../utils/timeUtils';

interface ScrumSprintBoardProps {
  currentUser: UserAccount;
  sprint: ScrumSprint;
  records: AttendanceRecord[];
  onOpenJustification: (record: AttendanceRecord) => void;
  onOpenEmployeeModal?: (employeeName: string) => void;
}

export const ScrumSprintBoard: React.FC<ScrumSprintBoardProps> = ({
  currentUser,
  sprint,
  records,
  onOpenJustification,
  onOpenEmployeeModal,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Slices by incident category
  const backlogIncidents = useMemo(() => {
    return records.filter(
      (r) => (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) && !r.justificationReason
    );
  }, [records]);

  const underReviewIncidents = useMemo(() => {
    return records.filter(
      (r) => r.status === 'JUSTIFICADO' || (r.justificationReason && r.isJustified)
    );
  }, [records]);

  const deficitIncidents = useMemo(() => {
    return records.filter((r) => r.status === 'DEFICIT');
  }, [records]);

  const completedCount = useMemo(() => {
    return records.filter((r) => r.status === 'CUMPLIDO' || r.status === 'SUPERAVIT').length;
  }, [records]);

  const totalRecords = records.length;
  const currentAttendanceRate = totalRecords > 0 ? Math.round((completedCount / totalRecords) * 100) : 0;
  const isMeetingGoal = currentAttendanceRate >= sprint.targetAttendanceRate;

  return (
    <div className="space-y-6">
      {/* Sprint Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-white">{sprint.name}</h2>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                Sprint Activo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <strong>Sprint Goal:</strong> {sprint.goal}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Meta Asistencia
              </span>
              <span className="text-xl font-black text-amber-400">≥{sprint.targetAttendanceRate}%</span>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Tasa Actual
              </span>
              <span
                className={`text-xl font-black ${
                  isMeetingGoal ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentAttendanceRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board of Attendance Incidents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Tablero Scrum de Resolución de Asistencia
          </h3>
          <span className="text-xs text-slate-500">
            {records.length} registros en sprint
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Backlog de Inasistencias Pendientes */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-rose-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Inasistencias Sin Justificar ({backlogIncidents.length})
              </span>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                Por Atender
              </span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1 max-h-[500px] overflow-y-auto pr-1">
              {backlogIncidents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No hay inasistencias pendientes en el backlog.
                </div>
              ) : (
                backlogIncidents.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs hover:border-rose-400 transition-all text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                          className="font-bold text-slate-900 hover:text-[#1F4E79] text-left cursor-pointer"
                        >
                          {rec.employeeName}
                        </button>
                        <span className="text-[10px] text-slate-500 block">
                          {rec.site} • {formatDateSpanish(rec.date, true)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                        -8.0h
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenJustification(rec)}
                      className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                    >
                      <span>Gestionar Justificativo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Justificados & Permisos Amparados */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-blue-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Justificados y Permisos ({underReviewIncidents.length})
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Auditados
              </span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1 max-h-[500px] overflow-y-auto pr-1">
              {underReviewIncidents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No hay ausencias justificadas en este período.
                </div>
              ) : (
                underReviewIncidents.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                          className="font-bold text-slate-900 hover:text-[#1F4E79] text-left cursor-pointer"
                        >
                          {rec.employeeName}
                        </button>
                        <span className="text-[10px] text-slate-500 block">
                          {rec.site} • {formatDateSpanish(rec.date, true)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Amparado
                      </span>
                    </div>

                    <div className="bg-blue-50/60 p-2 rounded-lg text-[11px] text-blue-900">
                      <strong>Causa:</strong> {rec.justificationReason || 'Permiso Autorizado'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Salidas Anticipadas / Déficits de Horas */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-amber-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Déficit Horario ({deficitIncidents.length})
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Observación
              </span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1 max-h-[500px] overflow-y-auto pr-1">
              {deficitIncidents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No hay jornadas con déficit horario registrado.
                </div>
              ) : (
                deficitIncidents.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                          className="font-bold text-slate-900 hover:text-[#1F4E79] text-left cursor-pointer"
                        >
                          {rec.employeeName}
                        </button>
                        <span className="text-[10px] text-slate-500 block">
                          {rec.site} • {formatDateSpanish(rec.date, true)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {rec.balanceHours}h
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                      <span>
                        Neto: <strong>{rec.netHours}h</strong> / 8.0h
                      </span>
                      <span>
                        Salida: <strong>{rec.lastCheckOut}</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
