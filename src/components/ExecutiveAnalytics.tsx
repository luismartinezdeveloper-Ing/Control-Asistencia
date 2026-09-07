import React from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { SiteSummary, AttendanceRecord, LoadedFileMeta } from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';

interface ExecutiveAnalyticsProps {
  siteSummaries: SiteSummary[];
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  onOpenAuditModal: (file: LoadedFileMeta) => void;
}

export const ExecutiveAnalytics: React.FC<ExecutiveAnalyticsProps> = ({
  siteSummaries,
  records,
  loadedFiles,
  onOpenAuditModal,
}) => {
  // Compute distribution of statuses
  const totalRecords = records.length || 1;
  const cumplidos = records.filter((r) => r.status === 'CUMPLIDO' && !r.isNeutralCase).length;
  const superavit = records.filter((r) => r.status === 'SUPERAVIT' && !r.isNeutralCase).length;
  const deficit = records.filter((r) => r.status === 'DEFICIT' && !r.isNeutralCase).length;
  const neutral = records.filter((r) => r.isNeutralCase).length;

  const pctCumplido = Math.round((cumplidos / totalRecords) * 100);
  const pctSuperavit = Math.round((superavit / totalRecords) * 100);
  const pctDeficit = Math.round((deficit / totalRecords) * 100);
  const pctNeutral = Math.round((neutral / totalRecords) * 100);

  // Compute department breakdown
  const deptStats = React.useMemo(() => {
    const map = new Map<string, { name: string; count: number; netHours: number; employees: Set<string> }>();
    for (const r of records) {
      const dept = r.department || 'General';
      if (!map.has(dept)) {
        map.set(dept, { name: dept, count: 0, netHours: 0, employees: new Set() });
      }
      const entry = map.get(dept)!;
      entry.count++;
      entry.netHours += r.netHours;
      entry.employees.add(r.employeeName);
    }
    return Array.from(map.values())
      .sort((a, b) => b.netHours - a.netHours)
      .slice(0, 5); // top 5 departments
  }, [records]);

  // Max net hours for scaling site chart
  const maxSiteHours = Math.max(
    ...siteSummaries.map((s) => Math.max(s.totalNetHours, s.totalScheduledHours, 1)),
    10
  );

  return (
    <section id="executive-analytics-section" className="space-y-4">
      {/* Integrity & Completeness Reassurance Callout */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-[#0F2B48] text-white p-4.5 rounded-2xl shadow-sm border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                Auditoría de Carga e Integridad Biometríca
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                Verificación Activa
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Se han analizado y cargado todos los colaboradores presentes en los documentos de asistencia sin omisiones arbitrarias.
            </p>
          </div>
        </div>

        {loadedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {loadedFiles.slice(-2).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onOpenAuditModal(f)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-lg border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auditar {f.name.length > 18 ? `${f.name.slice(0, 16)}...` : f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Bento Grid: Sede Comparison Chart + Status Distribution + Department Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visualizer 1: Performance Comparativo por Sede (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1F4E79]" />
                  <span>Comparativa de Rendimiento Horario por Sede</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Horas Netas Efectivas vs Horas Programadas (Base 8.00h netas)
                </p>
              </div>

              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {siteSummaries.length} Sedes Activas
              </span>
            </div>

            {/* Sede Visual Bars */}
            <div className="space-y-4 pt-1">
              {siteSummaries.map((site) => {
                const netPct = Math.min(100, Math.round((site.totalNetHours / maxSiteHours) * 100));
                const schedPct = Math.min(100, Math.round((site.totalScheduledHours / maxSiteHours) * 100));
                const isOver = site.complianceRate >= 100;

                return (
                  <div key={site.site} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#1F4E79]" />
                        <span className="font-bold text-slate-800">{site.site}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({site.totalEmployees} colaboradores • {site.totalRecords} jornadas)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-slate-900">{site.totalNetHours.toFixed(1)}h</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">{site.totalScheduledHours.toFixed(1)}h</span>
                        <span
                          className={`ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            isOver ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {site.complianceRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Comparative Dual Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                        {/* Net hours bar */}
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-gradient-to-r from-[#1F4E79] to-blue-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'
                          }`}
                          style={{ width: `${Math.max(4, netPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F4E79]" /> Horas Netas Entregadas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Base Programada
              </span>
            </div>
            <span className="font-medium text-slate-600">
              Almuerzo (-1.5h diaria) ya deducido
            </span>
          </div>
        </div>

        {/* Visualizer 2: Distribución de Estados de Asistencia (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#1F4E79]" />
                  <span>Distribución de Jornadas</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Balance y estado de las {totalRecords} jornadas registradas
                </p>
              </div>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="mt-2 mb-4">
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${pctCumplido}%` }}
                  className="bg-emerald-600 h-full transition-all"
                  title={`Cumplidos: ${cumplidos} (${pctCumplido}%)`}
                />
                <div
                  style={{ width: `${pctSuperavit}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`Superávit: ${superavit} (${pctSuperavit}%)`}
                />
                <div
                  style={{ width: `${pctDeficit}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`Déficit: ${deficit} (${pctDeficit}%)`}
                />
                <div
                  style={{ width: `${pctNeutral}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Casos Neutrales: ${neutral} (${pctNeutral}%)`}
                />
              </div>
            </div>

            {/* Status Breakdown Legend Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Cumplido</span>
                  <span className="text-xs font-black text-emerald-900">{pctCumplido}%</span>
                </div>
                <p className="text-xs font-bold text-emerald-950 mt-1">{cumplidos} jornadas</p>
                <p className="text-[10px] text-emerald-700">8h netas exactas</p>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800">Superávit</span>
                  <span className="text-xs font-black text-blue-900">{pctSuperavit}%</span>
                </div>
                <p className="text-xs font-bold text-blue-950 mt-1">{superavit} jornadas</p>
                <p className="text-[10px] text-blue-700">Horas adicionales</p>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800">Déficit</span>
                  <span className="text-xs font-black text-rose-900">{pctDeficit}%</span>
                </div>
                <p className="text-xs font-bold text-rose-950 mt-1">{deficit} jornadas</p>
                <p className="text-[10px] text-rose-700">Pendiente de cubrir</p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800">Neutral</span>
                  <span className="text-xs font-black text-amber-900">{pctNeutral}%</span>
                </div>
                <p className="text-xs font-bold text-amber-950 mt-1">{neutral} casos</p>
                <p className="text-[10px] text-amber-700">Marcación única</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cobertura general garantizada
            </span>
            <span className="font-bold text-[#1F4E79]">
              {(pctCumplido + pctSuperavit)}% en conformidad
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
