import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ChevronRight,
  TrendingUp,
  UserX,
  FileCheck2,
} from 'lucide-react';
import { SiteSummary, AttendanceRecord } from '../types/attendance';

interface ExecutiveSitesCardsProps {
  siteSummaries: SiteSummary[];
  records: AttendanceRecord[];
  onOpenEmployeeModal: (name: string) => void;
}

export const ExecutiveSitesCards: React.FC<ExecutiveSitesCardsProps> = ({
  siteSummaries,
  records,
  onOpenEmployeeModal,
}) => {
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string | null>(null);

  // Helper to group records by site and get unique employees
  const siteDetails = siteSummaries.map((site) => {
    const siteRecords = records.filter(
      (r) => r.site.toLowerCase().trim() === site.site.toLowerCase().trim()
    );
    const uniqueEmployees = Array.from(new Set(siteRecords.map((r) => r.employeeName)));
    const absences = siteRecords.filter(
      (r) => r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)
    );
    const justified = siteRecords.filter(
      (r) => r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)
    );

    let statusType: 'optimal' | 'warning' | 'alert' = 'optimal';
    if (absences.length > 0) {
      statusType = 'alert';
    } else if (site.complianceRate < 95 || site.neutralCases > 0) {
      statusType = 'warning';
    }

    return {
      ...site,
      uniqueEmployees,
      absencesCount: absences.length,
      justifiedCount: justified.length,
      statusType,
    };
  });

  return (
    <section id="executive-sites-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1F4E79]" />
            <span>Estado Operativo por Sucursal y Sede</span>
          </h3>
          <p className="text-xs text-slate-500">
            Vista ejecutiva de la asistencia, disciplina y cumplimiento en cada centro de trabajo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {siteDetails.map((site) => {
          const isAlert = site.statusType === 'alert';
          const isWarning = site.statusType === 'warning';
          const isOptimal = site.statusType === 'optimal';

          return (
            <div
              key={site.site}
              className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${
                isAlert
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : isWarning
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#1F4E79]" />
                      <span>{site.site}</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {site.uniqueEmployees.length} colaboradores asignados
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${
                      isAlert
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAlert ? 'bg-rose-600' : isWarning ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}
                    />
                    {isAlert ? 'Atención Requerida' : isWarning ? 'En Observación' : '100% Operativa'}
                  </span>
                </div>

                {/* Progress bar of compliance */}
                <div className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Cumplimiento de Horas</span>
                    <span
                      className={`font-black ${
                        site.complianceRate >= 95
                          ? 'text-emerald-700'
                          : site.complianceRate >= 85
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {Math.round(site.complianceRate)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        site.complianceRate >= 95
                          ? 'bg-emerald-500'
                          : site.complianceRate >= 85
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(site.complianceRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Quick stats in 2 columns */}
                <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Horas Netas
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {site.totalNetHours.toFixed(1)}h
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Balance
                    </span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        site.varianceHours >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {site.varianceHours >= 0
                        ? `+${site.varianceHours.toFixed(1)}h`
                        : `${site.varianceHours.toFixed(1)}h`}
                    </span>
                  </div>
                </div>

                {/* Novedades rápidas */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {site.absencesCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <UserX className="w-3 h-3" />
                      {site.absencesCount} falta(s)
                    </span>
                  )}
                  {site.justifiedCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <FileCheck2 className="w-3 h-3" />
                      {site.justifiedCount} justificado(s)
                    </span>
                  )}
                  {site.neutralCases > 0 && (
                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-[10px] font-medium flex items-center gap-1">
                      {site.neutralCases} marcación única
                    </span>
                  )}
                  {site.absencesCount === 0 && site.neutralCases === 0 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                      Asistencia completa y puntual
                    </span>
                  )}
                </div>

                {/* Equipo (Avatar Chips) */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1.5">
                    Equipo de la Sede
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {site.uniqueEmployees.slice(0, 6).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => onOpenEmployeeModal(name)}
                        className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#1F4E79] rounded-lg text-[11px] font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ver resumen de este colaborador"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>{name.split(' ')[0]}</span>
                      </button>
                    ))}
                    {site.uniqueEmployees.length > 6 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                        +{site.uniqueEmployees.length - 6} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
