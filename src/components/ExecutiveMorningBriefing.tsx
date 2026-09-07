import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  ShieldCheck,
  FileCheck2,
  UserX,
  TrendingUp,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary, SiteSummary, GlobalKPIs } from '../types/attendance';

interface ExecutiveMorningBriefingProps {
  records: AttendanceRecord[];
  kpis: GlobalKPIs;
  siteSummaries: SiteSummary[];
  employeeSummaries: EmployeeSummary[];
  onOpenEmployeeModal: (name: string) => void;
  onOpenJustification: (record: AttendanceRecord) => void;
  onGoToDailyReport: () => void;
}

export const ExecutiveMorningBriefing: React.FC<ExecutiveMorningBriefingProps> = ({
  records,
  kpis,
  siteSummaries,
  employeeSummaries,
  onOpenEmployeeModal,
  onOpenJustification,
  onGoToDailyReport,
}) => {
  // Find pending unjustified absences
  const pendingAbsences = records.filter(
    (r) => r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)
  );

  // Find justified cases
  const justifiedCases = records.filter(
    (r) => r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)
  );

  // Best performing site
  const sortedSites = [...siteSummaries].sort((a, b) => b.complianceRate - a.complianceRate);
  const bestSite = sortedSites[0];
  const siteWithAttention = sortedSites.find((s) => s.absenceCases > 0 || s.complianceRate < 90);

  // Find employees with high deficit (more than 2h deficit)
  const employeesWithDeficit = employeeSummaries
    .filter((e) => e.varianceHours < -1.5 && e.absenceDays === 0)
    .sort((a, b) => a.varianceHours - b.varianceHours)
    .slice(0, 3);

  // Latest date
  const uniqueDates = Array.from(new Set(records.map((r) => r.date))).sort().reverse();
  const latestDate = uniqueDates[0] || 'Período actual';

  // Traffic light statuses
  const attendanceRate = kpis.globalComplianceRate;
  const isAttendanceGood = attendanceRate >= 92;
  const hasCriticalAlerts = pendingAbsences.length > 0;

  return (
    <section id="executive-morning-briefing" className="space-y-4">
      {/* Narrative Briefing Card (El Resumen en 15 Segundos) */}
      <div className="bg-gradient-to-br from-[#1F4E79] via-[#163857] to-[#0d2338] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-blue-900/50 relative overflow-hidden">
        {/* Subtle decorative background accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-blue-100">
                Resumen Ejecutivo para la Dirección
              </h2>
            </div>
            <span className="text-xs text-blue-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 w-fit">
              Corte de Operaciones: <strong className="text-white">{latestDate}</strong>
            </span>
          </div>

          {/* Narrative text in plain human language */}
          <div className="text-sm sm:text-base leading-relaxed text-blue-50 font-normal">
            <p>
              Actualmente tu fuerza laboral cuenta con un{' '}
              <strong className="text-emerald-300 font-bold underline decoration-emerald-400/50 underline-offset-4">
                {Math.round(attendanceRate)}% de cumplimiento operativo
              </strong>
              . De los <strong className="text-white font-bold">{kpis.totalEmployees} colaboradores</strong> registrados en el sistema,{' '}
              {pendingAbsences.length === 0 ? (
                <span>
                  <strong className="text-emerald-300 font-bold">todos están asistiendo con regularidad</strong> y no hay ausencias sin atender.
                </span>
              ) : (
                <span>
                  se registran{' '}
                  <strong className="text-rose-300 font-bold">
                    {pendingAbsences.length} {pendingAbsences.length === 1 ? 'inasistencia sin justificar' : 'inasistencias sin justificar'}
                  </strong>{' '}
                  que impactan la productividad de la empresa.
                </span>
              )}
              {justifiedCases.length > 0 && (
                <span>
                  {' '}Se tienen{' '}
                  <strong className="text-blue-200 font-semibold">
                    {justifiedCases.length} {justifiedCases.length === 1 ? 'permiso amparado' : 'permisos amparados'}
                  </strong>{' '}
                  por reposo médico o causa institucional.
                </span>
              )}
              {bestSite && (
                <span>
                  {' '}La sede con mejor disciplina es{' '}
                  <strong className="text-amber-200 font-semibold">{bestSite.site}</strong> ({Math.round(bestSite.complianceRate)}% de horas cumplidas).
                </span>
              )}
            </p>
          </div>

          {/* 3 High-Level Strategic Traffic Lights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/15">
            {/* Traffic Light 1: Asistencia */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${
                  isAttendanceGood ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                }`}
              >
                {isAttendanceGood ? '🟢' : '🟡'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider">
                  Nivel de Asistencia
                </span>
                <p className="text-sm font-bold text-white">
                  {Math.round(attendanceRate)}% {isAttendanceGood ? '• Normal y Estable' : '• Bajo Observación'}
                </p>
              </div>
            </div>

            {/* Traffic Light 2: Disciplina Horaria */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${
                  kpis.totalNetHours >= kpis.totalScheduledHours * 0.95
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                }`}
              >
                {kpis.totalNetHours >= kpis.totalScheduledHours * 0.95 ? '🟢' : '🟡'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider">
                  Jornadas Completadas
                </span>
                <p className="text-sm font-bold text-white">
                  {kpis.totalNetHours.toFixed(0)}h netas de {kpis.totalScheduledHours.toFixed(0)}h prog.
                </p>
              </div>
            </div>

            {/* Traffic Light 3: Novedades / Alertas Críticas */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${
                  hasCriticalAlerts
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse'
                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                }`}
              >
                {hasCriticalAlerts ? '🔴' : '🟢'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider">
                  Atención Inmediata
                </span>
                <p className="text-sm font-bold text-white">
                  {pendingAbsences.length > 0
                    ? `${pendingAbsences.length} falta(s) por auditar`
                    : 'Sin novedades críticas'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Action Section: "Colaboradores que Requieren tu Atención" */}
      {hasCriticalAlerts ? (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-rose-950 uppercase tracking-wider">
                  Novedades Críticas: Inasistencias no Justificadas ({pendingAbsences.length})
                </h3>
                <p className="text-xs text-rose-700">
                  Estos colaboradores no tienen registro de entrada ni salida en las fechas señaladas y restan 8 horas a la jornada.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {pendingAbsences.map((rec) => (
              <div
                key={rec.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {rec.employeeName}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{rec.site}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700 font-semibold">{rec.date}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider shrink-0">
                    Falta (-8h)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenEmployeeModal(rec.employeeName)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-[#1F4E79] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenJustification(rec)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Justificar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Operación en Plena Normalidad
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                No hay inasistencias sin justificar pendientes de resolución en los cortes registrados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToDailyReport}
            className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <span>Ver Reporte Diario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
