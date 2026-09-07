import React from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  UserX,
  FileCheck2,
} from 'lucide-react';
import { GlobalKPIs } from '../types/attendance';

interface KpiCardsProps {
  kpis: GlobalKPIs;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  const isHighCompliance = kpis.globalComplianceRate >= 100;
  const varianceHours = Math.round((kpis.totalNetHours - kpis.totalScheduledHours) * 100) / 100;
  const isPositiveVariance = varianceHours >= 0;
  const totalAbsences = kpis.totalAbsences ?? 0;
  const totalJustified = kpis.totalJustified ?? 0;

  return (
    <section id="kpi-cards-section" className="col-span-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* KPI 1: Total Empleados Activos */}
        <div
          id="kpi-card-employees"
          className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Fuerza Laboral
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79] group-hover:bg-blue-100 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {kpis.totalEmployees}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="font-bold text-[#1F4E79]">{kpis.totalRecords}</span> jornadas
            </p>
          </div>
        </div>

        {/* KPI 2: Total Horas Netas Trabajadas */}
        <div
          id="kpi-card-net-hours"
          className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Horas Netas
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {kpis.totalNetHours.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <span className="text-xs text-slate-500 font-bold">h</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Almuerzo deducido (-1.5h)
            </p>
          </div>
        </div>

        {/* KPI 3: Meta Programada */}
        <div
          id="kpi-card-scheduled-hours"
          className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Programado
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {kpis.totalScheduledHours.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <span className="text-xs text-slate-500 font-bold">h</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Exigible 8.0h / jornada
            </p>
          </div>
        </div>

        {/* KPI 4: % Cumplimiento Global */}
        <div
          id="kpi-card-compliance"
          className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Cumplimiento
            </span>
            <div className={`p-1.5 rounded-lg ${isHighCompliance ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} transition-colors`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-black tracking-tight ${isHighCompliance ? 'text-emerald-700' : 'text-amber-700'}`}>
                {kpis.globalComplianceRate.toFixed(1)}%
              </p>
              <span className="text-[10px] font-bold">
                {isPositiveVariance ? (
                  <span className="text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />+{varianceHours.toFixed(1)}h
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center">
                    <ArrowDownRight className="w-3 h-3" />{varianceHours.toFixed(1)}h
                  </span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {isHighCompliance ? 'Jornada cubierta' : 'Déficit acumulado'}
            </p>
          </div>
        </div>

        {/* KPI 5: Inasistencias (Faltas no justiciadas) */}
        <div
          id="kpi-card-absences"
          className={`bg-white p-4 rounded-2xl shadow-xs border flex flex-col justify-between transition-all hover:shadow-md group ${
            totalAbsences > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Inasistencias
            </span>
            <div className={`p-1.5 rounded-lg ${totalAbsences > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-black tracking-tight ${totalAbsences > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                {totalAbsences}
              </p>
              {totalAbsences > 0 && (
                <span className="text-[10px] font-bold text-rose-600">
                  -{(totalAbsences * 8).toFixed(0)}h déficit
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {totalAbsences > 0 ? 'Sin justificación (falta)' : 'Sin inasistencias'}
            </p>
          </div>
        </div>

        {/* KPI 6: Justificados y Casos Neutrales */}
        <div
          id="kpi-card-neutral-cases"
          className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Justificados / N
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {totalJustified}
              </p>
              {kpis.totalNeutralCases > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  +{kpis.totalNeutralCases} N
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /> Eximidos de déficit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
