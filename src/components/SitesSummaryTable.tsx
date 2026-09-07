import React from 'react';
import { Building2, Factory, GraduationCap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SiteSummary } from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';

interface SitesSummaryTableProps {
  siteSummaries: SiteSummary[];
}

export const SitesSummaryTable: React.FC<SitesSummaryTableProps> = ({ siteSummaries }) => {
  const getSiteIcon = (siteName: string) => {
    const name = siteName.toLowerCase();
    if (name.includes('opeconca') || name.includes('oficina')) {
      return <Building2 className="w-4 h-4 text-[#1F4E79]" />;
    }
    if (name.includes('nalys')) {
      return <Factory className="w-4 h-4 text-indigo-700" />;
    }
    return <GraduationCap className="w-4 h-4 text-emerald-700" />;
  };

  return (
    <section
      id="sites-summary-section"
      className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#1F4E79]" />
          <span>Resumen Consolidado por Sede y Formato</span>
        </h2>
        <span className="text-[10px] text-gray-500 uppercase font-semibold">
          {siteSummaries.length} sedes procesadas
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px]">
              <tr>
                <th scope="col" className="px-4 py-2.5">Sede / Formato</th>
                <th scope="col" className="px-3 py-2.5 text-center">Colaboradores</th>
                <th scope="col" className="px-3 py-2.5 text-center">Jornadas</th>
                <th scope="col" className="px-3 py-2.5 text-right">Horas Netas</th>
                <th scope="col" className="px-3 py-2.5 text-right">Horas Prog.</th>
                <th scope="col" className="px-3 py-2.5 text-right">Balance</th>
                <th scope="col" className="px-4 py-2.5 text-center">Cumplimiento</th>
                <th scope="col" className="px-3 py-2.5 text-center">Casos Neutrales</th>
                <th scope="col" className="px-3 py-2.5 text-center">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {siteSummaries.map((site) => {
                const isCompliant = site.complianceRate >= 100;
                const isPositiveVariance = site.varianceHours >= 0;

                return (
                  <tr key={site.site} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-gray-100 text-[#1F4E79]">
                          {getSiteIcon(site.site)}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block">{site.site}</span>
                          <span className="text-[10px] text-gray-400">
                            {site.site.includes('Opeconca')
                              ? 'Biométrico Opeconca'
                              : site.site.includes('Nalys')
                              ? 'Reporte Nalys'
                              : 'Reporte UNEFA'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-800 whitespace-nowrap">
                      {site.totalEmployees}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">
                      {site.totalRecords}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {site.totalNetHours.toFixed(2)} h
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500 whitespace-nowrap">
                      {site.totalScheduledHours.toFixed(2)} h
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          isPositiveVariance ? 'text-green-600' : 'text-rose-600'
                        }`}
                      >
                        {formatVariance(site.varianceHours)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              isCompliant ? 'bg-green-600' : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, site.complianceRate))}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`font-bold text-xs ${
                            isCompliant ? 'text-green-700' : 'text-amber-700'
                          }`}
                        >
                          {site.complianceRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {site.neutralCases > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          {site.neutralCases}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {isCompliant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-green-600" /> Meta Cumplida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Diferencia
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
