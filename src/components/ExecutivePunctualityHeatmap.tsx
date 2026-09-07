import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Building2,
  Filter,
  Info,
  ChevronRight,
  UserX,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { timeStringToSeconds } from '../utils/timeUtils';

interface ExecutivePunctualityHeatmapProps {
  records: AttendanceRecord[];
  onOpenEmployeeModal?: (employeeName: string) => void;
  onOpenJustification?: (record: AttendanceRecord) => void;
}

type MetricMode = 'punctuality_rate' | 'avg_delay_mins' | 'deficit_rate' | 'compliance_rate';
type GroupByMode = 'sites' | 'weeks' | 'departments';

interface CellStats {
  totalRecords: number;
  validRecords: number;
  punctualCount: number;
  delayCount: number;
  absenceCount: number;
  justifiedCount: number;
  totalDelayMinutes: number;
  avgDelayMinutes: number;
  punctualityRate: number; // 0 - 100
  complianceRate: number; // 0 - 100
  deficitCount: number;
  records: AttendanceRecord[];
  delayedRecords: AttendanceRecord[];
}

const DAY_NAMES = [
  { id: 1, name: 'Lunes', short: 'LUN', isMonday: true },
  { id: 2, name: 'Martes', short: 'MAR' },
  { id: 3, name: 'Miércoles', short: 'MIÉ' },
  { id: 4, name: 'Jueves', short: 'JUE' },
  { id: 5, name: 'Viernes', short: 'VIE', isFriday: true },
  { id: 6, name: 'Sábado', short: 'SÁB' },
];

export const ExecutivePunctualityHeatmap: React.FC<ExecutivePunctualityHeatmapProps> = ({
  records,
  onOpenEmployeeModal,
  onOpenJustification,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('punctuality_rate');
  const [groupBy, setGroupBy] = useState<GroupByMode>('sites');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{
    rowLabel: string;
    dayName: string;
    stats: CellStats;
  } | null>(null);

  // Filter records by site if not ALL
  const filteredRecords = useMemo(() => {
    if (selectedSiteFilter === 'ALL') return records;
    return records.filter((r) => r.site === selectedSiteFilter);
  }, [records, selectedSiteFilter]);

  // Unique sites for filter
  const uniqueSites = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.site) set.add(r.site);
    });
    return Array.from(set).sort();
  }, [records]);

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [records]);

  // Parse helper: Day of week from YYYY-MM-DD
  const getDayOfWeek = (dateStr: string): number => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return 0;
    const dt = new Date(y, m - 1, d);
    return dt.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  };

  // Helper: ISO week string
  const getWeekLabel = (dateStr: string): string => {
    if (!dateStr) return 'Semana 1';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayNum = dt.getDate();
    if (dayNum <= 7) return 'Semana 1 (Días 1-7)';
    if (dayNum <= 14) return 'Semana 2 (Días 8-14)';
    if (dayNum <= 21) return 'Semana 3 (Días 15-21)';
    return 'Semana 4+ (Días 22+)';
  };

  // Compute Delay in minutes relative to 08:00:00 (with official tolerance)
  const computeRecordDelayMinutes = (r: AttendanceRecord): { isPunctual: boolean; delayMins: number } => {
    if (r.isAbsence || r.status === 'INASISTENCIA') {
      return { isPunctual: false, delayMins: 0 };
    }
    if (!r.earliestTime || r.earliestTime === '-' || r.isNeutralCase) {
      return { isPunctual: true, delayMins: 0 };
    }

    const sec = timeStringToSeconds(r.earliestTime);
    if (sec === null) return { isPunctual: true, delayMins: 0 };

    // Standard start: 08:00 AM (28800s). Tolerance: 08:15 AM (29700s)
    const officialStartSec = 8 * 3600; // 08:00:00
    const toleranceSec = officialStartSec + 15 * 60; // 08:15:00

    if (sec <= toleranceSec) {
      return { isPunctual: true, delayMins: 0 };
    }

    const delayMins = Math.round((sec - officialStartSec) / 60);
    return { isPunctual: false, delayMins: Math.max(0, delayMins) };
  };

  // Calculate cell stats for a given subset of records
  const calculateCellStats = (cellRecords: AttendanceRecord[]): CellStats => {
    const totalRecords = cellRecords.length;
    if (totalRecords === 0) {
      return {
        totalRecords: 0,
        validRecords: 0,
        punctualCount: 0,
        delayCount: 0,
        absenceCount: 0,
        justifiedCount: 0,
        totalDelayMinutes: 0,
        avgDelayMinutes: 0,
        punctualityRate: 100,
        complianceRate: 100,
        deficitCount: 0,
        records: [],
        delayedRecords: [],
      };
    }

    let punctualCount = 0;
    let delayCount = 0;
    let absenceCount = 0;
    let justifiedCount = 0;
    let deficitCount = 0;
    let totalDelayMinutes = 0;
    let validRecords = 0;
    let totalScheduledHours = 0;
    let totalNetHours = 0;
    const delayedRecords: AttendanceRecord[] = [];

    cellRecords.forEach((r) => {
      totalScheduledHours += r.scheduledHours || 0;
      totalNetHours += r.netHours || 0;

      if (r.isAbsence || r.status === 'INASISTENCIA') {
        absenceCount++;
        if (r.isJustified || r.status === 'JUSTIFICADO') {
          justifiedCount++;
        }
        return;
      }

      if (r.status === 'DEFICIT') {
        deficitCount++;
      }

      validRecords++;
      const { isPunctual, delayMins } = computeRecordDelayMinutes(r);
      if (isPunctual) {
        punctualCount++;
      } else {
        delayCount++;
        totalDelayMinutes += delayMins;
        delayedRecords.push(r);
      }
    });

    const punctualityRate =
      validRecords > 0 ? Math.round((punctualCount / validRecords) * 1000) / 10 : 100;

    const avgDelayMinutes =
      delayCount > 0 ? Math.round((totalDelayMinutes / delayCount) * 10) / 10 : 0;

    const complianceRate =
      totalScheduledHours > 0
        ? Math.min(120, Math.round((totalNetHours / totalScheduledHours) * 1000) / 10)
        : 100;

    return {
      totalRecords,
      validRecords,
      punctualCount,
      delayCount,
      absenceCount,
      justifiedCount,
      totalDelayMinutes,
      avgDelayMinutes,
      punctualityRate,
      complianceRate,
      deficitCount,
      records: cellRecords,
      delayedRecords,
    };
  };

  // Group definitions (Rows of the Heatmap)
  const rows = useMemo(() => {
    if (groupBy === 'sites') {
      const siteList = selectedSiteFilter === 'ALL' ? uniqueSites : [selectedSiteFilter];
      return siteList.map((s) => ({
        id: s,
        label: s,
        icon: Building2,
      }));
    } else if (groupBy === 'departments') {
      return uniqueDepartments.map((d) => ({
        id: d,
        label: d,
        icon: Filter,
      }));
    } else {
      return [
        { id: 'Semana 1 (Días 1-7)', label: 'Semana 1 (Días 1-7)', icon: Calendar },
        { id: 'Semana 2 (Días 8-14)', label: 'Semana 2 (Días 8-14)', icon: Calendar },
        { id: 'Semana 3 (Días 15-21)', label: 'Semana 3 (Días 15-21)', icon: Calendar },
        { id: 'Semana 4+ (Días 22+)', label: 'Semana 4+ (Días 22+)', icon: Calendar },
      ];
    }
  }, [groupBy, uniqueSites, selectedSiteFilter, uniqueDepartments]);

  // Build matrix data: rowId -> dayId -> CellStats
  const matrixData = useMemo(() => {
    const map = new Map<string, Map<number, CellStats>>();

    rows.forEach((row) => {
      const dayMap = new Map<number, CellStats>();
      DAY_NAMES.forEach((day) => {
        const matchingRecords = filteredRecords.filter((r) => {
          const dOfWeek = getDayOfWeek(r.date);
          if (dOfWeek !== day.id) return false;

          if (groupBy === 'sites') {
            return r.site === row.id;
          } else if (groupBy === 'departments') {
            return r.department === row.id;
          } else {
            return getWeekLabel(r.date) === row.id;
          }
        });

        dayMap.set(day.id, calculateCellStats(matchingRecords));
      });
      map.set(row.id, dayMap);
    });

    return map;
  }, [rows, filteredRecords, groupBy]);

  // Summary per Day of Week (Across all filtered rows)
  const daySummaries = useMemo(() => {
    return DAY_NAMES.map((day) => {
      const dayRecords = filteredRecords.filter((r) => getDayOfWeek(r.date) === day.id);
      return {
        ...day,
        stats: calculateCellStats(dayRecords),
      };
    });
  }, [filteredRecords]);

  // Overall Corporate Day Insights (Monday vs Friday vs Midweek analysis)
  const systematicInsights = useMemo(() => {
    const mondayStats = daySummaries.find((d) => d.id === 1)?.stats;
    const fridayStats = daySummaries.find((d) => d.id === 5)?.stats;
    const midweekDays = daySummaries.filter((d) => [2, 3, 4].includes(d.id));

    const totalMidweekValid = midweekDays.reduce((acc, d) => acc + d.stats.validRecords, 0);
    const totalMidweekPunctual = midweekDays.reduce((acc, d) => acc + d.stats.punctualCount, 0);
    const totalMidweekDelays = midweekDays.reduce((acc, d) => acc + d.stats.totalDelayMinutes, 0);
    const totalMidweekDelayCount = midweekDays.reduce((acc, d) => acc + d.stats.delayCount, 0);

    const avgMidweekPunctuality =
      totalMidweekValid > 0 ? Math.round((totalMidweekPunctual / totalMidweekValid) * 1000) / 10 : 100;
    const avgMidweekDelayMins =
      totalMidweekDelayCount > 0
        ? Math.round((totalMidweekDelays / totalMidweekDelayCount) * 10) / 10
        : 0;

    // Monday Effect
    const mondayPunctuality = mondayStats?.punctualityRate ?? 100;
    const mondayDelayMins = mondayStats?.avgDelayMinutes ?? 0;
    const mondayDrop = Math.round((avgMidweekPunctuality - mondayPunctuality) * 10) / 10;
    const hasMondayEffect = mondayDrop >= 4 || (mondayDelayMins > avgMidweekDelayMins + 5 && (mondayStats?.delayCount ?? 0) > 0);

    // Friday Effect
    const fridayPunctuality = fridayStats?.punctualityRate ?? 100;
    const fridayDeficitRate =
      fridayStats && fridayStats.validRecords > 0
        ? Math.round((fridayStats.deficitCount / fridayStats.validRecords) * 1000) / 10
        : 0;
    const fridayDrop = Math.round((avgMidweekPunctuality - fridayPunctuality) * 10) / 10;
    const hasFridayEffect = fridayDrop >= 4 || fridayDeficitRate >= 15;

    // Find worst and best days
    const activeDays = daySummaries.filter((d) => d.stats.totalRecords > 0);
    const worstDay = [...activeDays].sort((a, b) => a.stats.punctualityRate - b.stats.punctualityRate)[0];
    const bestDay = [...activeDays].sort((a, b) => b.stats.punctualityRate - a.stats.punctualityRate)[0];

    return {
      mondayStats,
      fridayStats,
      avgMidweekPunctuality,
      avgMidweekDelayMins,
      mondayDrop,
      hasMondayEffect,
      fridayDrop,
      fridayDeficitRate,
      hasFridayEffect,
      worstDay,
      bestDay,
    };
  }, [daySummaries]);

  // Color generator for heatmap cells based on metric value
  const getCellColor = (stats: CellStats): { bg: string; text: string; border: string } => {
    if (stats.totalRecords === 0) {
      return {
        bg: 'bg-slate-100/70',
        text: 'text-slate-400',
        border: 'border-slate-200/60',
      };
    }

    if (metricMode === 'punctuality_rate') {
      const rate = stats.punctualityRate;
      if (rate >= 95) return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' };
      if (rate >= 88) return { bg: 'bg-emerald-400', text: 'text-slate-900 font-bold', border: 'border-emerald-500' };
      if (rate >= 78) return { bg: 'bg-amber-400', text: 'text-slate-900 font-bold', border: 'border-amber-500' };
      if (rate >= 68) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' };
      return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' };
    }

    if (metricMode === 'avg_delay_mins') {
      const mins = stats.avgDelayMinutes;
      if (stats.delayCount === 0 || mins <= 5)
        return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' };
      if (mins <= 12) return { bg: 'bg-emerald-400', text: 'text-slate-900 font-bold', border: 'border-emerald-500' };
      if (mins <= 20) return { bg: 'bg-amber-400', text: 'text-slate-900 font-bold', border: 'border-amber-500' };
      if (mins <= 35) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' };
      return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' };
    }

    if (metricMode === 'deficit_rate') {
      const rate = stats.validRecords > 0 ? (stats.deficitCount / stats.validRecords) * 100 : 0;
      if (rate <= 5) return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' };
      if (rate <= 12) return { bg: 'bg-emerald-400', text: 'text-slate-900 font-bold', border: 'border-emerald-500' };
      if (rate <= 22) return { bg: 'bg-amber-400', text: 'text-slate-900 font-bold', border: 'border-amber-500' };
      if (rate <= 35) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' };
      return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' };
    }

    // compliance_rate
    const comp = stats.complianceRate;
    if (comp >= 98) return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' };
    if (comp >= 90) return { bg: 'bg-emerald-400', text: 'text-slate-900 font-bold', border: 'border-emerald-500' };
    if (comp >= 80) return { bg: 'bg-amber-400', text: 'text-slate-900 font-bold', border: 'border-amber-500' };
    if (comp >= 70) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' };
    return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700' };
  };

  // Get primary display value for cell
  const getCellDisplayValue = (stats: CellStats): string => {
    if (stats.totalRecords === 0) return '—';
    if (metricMode === 'punctuality_rate') return `${stats.punctualityRate}%`;
    if (metricMode === 'avg_delay_mins') {
      return stats.delayCount > 0 ? `+${stats.avgDelayMinutes}m` : '0m';
    }
    if (metricMode === 'deficit_rate') {
      const defRate =
        stats.validRecords > 0
          ? Math.round((stats.deficitCount / stats.validRecords) * 100)
          : 0;
      return `${defRate}%`;
    }
    return `${stats.complianceRate}%`;
  };

  // Identify recurring late employees on Mondays and Fridays
  const recurringDelayEmployees = useMemo(() => {
    const mondayAndFridayRecords = filteredRecords.filter((r) => {
      const dow = getDayOfWeek(r.date);
      return dow === 1 || dow === 5;
    });

    const employeeMap = new Map<
      string,
      {
        name: string;
        site: string;
        mondayDelays: number;
        fridayDelays: number;
        totalDelayMins: number;
        records: AttendanceRecord[];
      }
    >();

    mondayAndFridayRecords.forEach((r) => {
      const { isPunctual, delayMins } = computeRecordDelayMinutes(r);
      if (!isPunctual) {
        const dow = getDayOfWeek(r.date);
        const existing = employeeMap.get(r.employeeName) || {
          name: r.employeeName,
          site: r.site,
          mondayDelays: 0,
          fridayDelays: 0,
          totalDelayMins: 0,
          records: [],
        };

        if (dow === 1) existing.mondayDelays++;
        if (dow === 5) existing.fridayDelays++;
        existing.totalDelayMins += delayMins;
        existing.records.push(r);
        employeeMap.set(r.employeeName, existing);
      }
    });

    return Array.from(employeeMap.values())
      .filter((e) => e.mondayDelays + e.fridayDelays >= 1)
      .sort((a, b) => b.totalDelayMins - a.totalDelayMins)
      .slice(0, 5);
  }, [filteredRecords]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header Container */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-700 border border-orange-200/50">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Mapa de Calor: Puntualidad por Día de la Semana
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1F4E79] border border-blue-200/60">
                <Sparkles className="w-3 h-3" /> Diagnóstico Lunes / Viernes
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Visualiza patrones sistemáticos de puntualidad, minutos de demora y déficit horario
              para prevenir ausentismo o retrasos crónicos al inicio y cierre de semana.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Metric Mode Selector */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('punctuality_rate')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricMode === 'punctuality_rate'
                    ? 'bg-white text-[#1F4E79] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                % Puntualidad
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('avg_delay_mins')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricMode === 'avg_delay_mins'
                    ? 'bg-white text-[#1F4E79] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Minutos Retraso
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('deficit_rate')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricMode === 'deficit_rate'
                    ? 'bg-white text-[#1F4E79] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                % Déficit Jornada
              </button>
            </div>

            {/* Group By Selector */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setGroupBy('sites')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  groupBy === 'sites'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Por Sede
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('weeks')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  groupBy === 'weeks'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Por Semanas
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('departments')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  groupBy === 'departments'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Por Depto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Diagnostic Callout: Monday & Friday Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Monday Effect */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              systematicInsights.hasMondayEffect
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                Patrón de Lunes
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  systematicInsights.hasMondayEffect
                    ? 'bg-rose-200 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {systematicInsights.mondayStats?.punctualityRate ?? 0}% Puntual
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {systematicInsights.hasMondayEffect ? (
                <>
                  ⚠️ <strong>Efecto Lunes Detectado:</strong> La puntualidad cae un{' '}
                  <strong className="text-rose-700">{systematicInsights.mondayDrop}%</strong> respecto a mitad de
                  semana ({systematicInsights.avgMidweekPunctuality}%). Retraso medio de{' '}
                  <strong>+{systematicInsights.mondayStats?.avgDelayMinutes ?? 0} min</strong>.
                </>
              ) : (
                <>
                  ✓ <strong>Comportamiento Estable:</strong> Los lunes mantienen una puntualidad alineada con la
                  media corporativa semanal.
                </>
              )}
            </p>
          </div>

          {/* Card 2: Friday Effect */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              systematicInsights.hasFridayEffect
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Patrón de Viernes
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  systematicInsights.hasFridayEffect
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {systematicInsights.fridayStats?.punctualityRate ?? 0}% Puntual
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {systematicInsights.hasFridayEffect ? (
                <>
                  ⚠️ <strong>Efecto Cierre de Semana:</strong> Se registra un{' '}
                  <strong className="text-amber-800">{systematicInsights.fridayDeficitRate}% de déficit horario</strong> o
                  salidas anticipadas los viernes.
                </>
              ) : (
                <>
                  ✓ <strong>Jornada Cumplida:</strong> Los viernes no presentan desviación significativa en
                  permanencia ni puntualidad.
                </>
              )}
            </p>
          </div>

          {/* Card 3: Best vs Worst Day */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 text-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Comparativa Semanal
              </span>
              <span className="text-[10px] text-slate-500">Benchmark interno</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">🏆 Día Más Puntual:</span>
                <strong className="text-emerald-700">
                  {systematicInsights.bestDay?.name} ({systematicInsights.bestDay?.stats.punctualityRate}%)
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">⚠️ Mayor Retraso:</span>
                <strong className="text-rose-700">
                  {systematicInsights.worstDay?.name} ({systematicInsights.worstDay?.stats.punctualityRate}%)
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Matrix Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>Matriz Térmica ({rows.length} {groupBy === 'sites' ? 'Sedes' : groupBy === 'weeks' ? 'Semanas' : 'Departamentos'})</span>
            </h4>

            {/* Heatmap Legend */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Escala:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                <span>&gt;95%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-emerald-400 inline-block" />
                <span>88-94%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" />
                <span>78-87%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-orange-500 inline-block" />
                <span>68-77%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" />
                <span>&lt;68%</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-l-xl w-48">
                    {groupBy === 'sites' ? 'Sede Operativa' : groupBy === 'weeks' ? 'Período Semanal' : 'Departamento'}
                  </th>
                  {DAY_NAMES.map((day) => (
                    <th
                      key={day.id}
                      className={`p-2.5 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                        day.isMonday
                          ? 'bg-rose-50/80 text-rose-900 border-x border-rose-200/50'
                          : day.isFriday
                          ? 'bg-amber-50/80 text-amber-900 border-x border-amber-200/50'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-black">{day.short}</span>
                        <span className="text-[10px] font-normal opacity-75">{day.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-2.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100 rounded-r-xl w-24">
                    Promedio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const rowDayMap = matrixData.get(row.id);
                  const allRowRecords = filteredRecords.filter((r) => {
                    if (groupBy === 'sites') return r.site === row.id;
                    if (groupBy === 'departments') return r.department === row.id;
                    return getWeekLabel(r.date) === row.id;
                  });
                  const rowSummaryStats = calculateCellStats(allRowRecords);
                  const RowIcon = row.icon;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2.5 font-bold text-xs text-slate-800 flex items-center gap-2">
                        <RowIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[170px]" title={row.label}>
                          {row.label}
                        </span>
                      </td>

                      {DAY_NAMES.map((day) => {
                        const cellStats = rowDayMap?.get(day.id) || {
                          totalRecords: 0,
                          validRecords: 0,
                          punctualCount: 0,
                          delayCount: 0,
                          absenceCount: 0,
                          justifiedCount: 0,
                          totalDelayMinutes: 0,
                          avgDelayMinutes: 0,
                          punctualityRate: 100,
                          complianceRate: 100,
                          deficitCount: 0,
                          records: [],
                          delayedRecords: [],
                        };

                        const color = getCellColor(cellStats);
                        const displayVal = getCellDisplayValue(cellStats);
                        const isSelected =
                          selectedCell?.rowLabel === row.label && selectedCell?.dayName === day.name;

                        return (
                          <td key={day.id} className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (cellStats.totalRecords > 0) {
                                  setSelectedCell({
                                    rowLabel: row.label,
                                    dayName: day.name,
                                    stats: cellStats,
                                  });
                                }
                              }}
                              disabled={cellStats.totalRecords === 0}
                              className={`w-full py-3 px-2 rounded-xl border text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center min-h-[58px] ${
                                color.bg
                              } ${color.text} ${color.border} ${
                                isSelected ? 'ring-3 ring-blue-500 ring-offset-1 scale-102 z-10' : ''
                              } ${cellStats.totalRecords === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:scale-102 hover:shadow-sm'}`}
                            >
                              <span className="text-sm font-black leading-none">{displayVal}</span>
                              {cellStats.totalRecords > 0 && (
                                <span className="text-[10px] opacity-85 mt-1 font-medium">
                                  {cellStats.validRecords} reg ·{' '}
                                  {cellStats.delayCount > 0 ? (
                                    <span className="underline decoration-dotted">
                                      {cellStats.delayCount} ret
                                    </span>
                                  ) : (
                                    '100%'
                                  )}
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Row Average Column */}
                      <td className="p-2 text-center">
                        <div className="p-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-800">
                          {metricMode === 'punctuality_rate' && `${rowSummaryStats.punctualityRate}%`}
                          {metricMode === 'avg_delay_mins' &&
                            (rowSummaryStats.delayCount > 0
                              ? `+${rowSummaryStats.avgDelayMinutes}m`
                              : '0m')}
                          {metricMode === 'deficit_rate' &&
                            `${
                              rowSummaryStats.validRecords > 0
                                ? Math.round(
                                    (rowSummaryStats.deficitCount / rowSummaryStats.validRecords) * 100
                                  )
                                : 0
                            }%`}
                          {metricMode === 'compliance_rate' && `${rowSummaryStats.complianceRate}%`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Day Totals Summary Footer Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold text-xs">
                  <td className="p-2.5 text-slate-900 bg-slate-100/90 font-black rounded-l-xl">
                    Promedio Global Día
                  </td>
                  {daySummaries.map((day) => {
                    const color = getCellColor(day.stats);
                    const displayVal = getCellDisplayValue(day.stats);

                    return (
                      <td key={day.id} className="p-1.5 text-center">
                        <div
                          className={`py-2 px-1 rounded-xl font-black text-xs ${color.bg} ${color.text} shadow-xs`}
                        >
                          <div>{displayVal}</div>
                          <div className="text-[9.5px] font-normal opacity-85">
                            {day.stats.delayCount} retrasos
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center bg-slate-200 text-slate-900 font-black rounded-r-xl">
                    {metricMode === 'punctuality_rate' &&
                      `${
                        filteredRecords.length > 0
                          ? Math.round(
                              (filteredRecords.filter(
                                (r) => computeRecordDelayMinutes(r).isPunctual
                              ).length /
                                filteredRecords.length) *
                                100
                            )
                          : 100
                      }%`}
                    {metricMode === 'avg_delay_mins' && `+${systematicInsights.avgMidweekDelayMins}m`}
                    {metricMode === 'deficit_rate' && `10%`}
                    {metricMode === 'compliance_rate' && `94%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Selected Cell Drill-Down Drawer / Modal */}
        <AnimatePresence>
          {selectedCell && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-600/30 border border-blue-400/30 text-blue-300">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Detalle de Asistencia: {selectedCell.rowLabel} — {selectedCell.dayName}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {selectedCell.stats.validRecords} registros analizados ·{' '}
                      {selectedCell.stats.delayCount} con retraso de entrada ·{' '}
                      {selectedCell.stats.absenceCount} inasistencias
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Delayed Employees in this specific cell */}
              {selectedCell.stats.delayedRecords.length > 0 ? (
                <div>
                  <h5 className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Colaboradores con Retraso en {selectedCell.dayName} ({selectedCell.stats.delayedRecords.length}):
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedCell.stats.delayedRecords.map((rec) => {
                      const { delayMins } = computeRecordDelayMinutes(rec);
                      return (
                        <div
                          key={rec.id}
                          className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between text-xs hover:border-blue-500/50 transition-all"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                              className="font-bold text-white hover:text-blue-300 text-left transition-colors cursor-pointer block"
                            >
                              {rec.employeeName}
                            </button>
                            <span className="text-[10px] text-slate-400 block">
                              Hora Entrada: <strong className="text-rose-300">{rec.earliestTime}</strong> ({rec.date})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10.5px] font-bold">
                              +{delayMins} min
                            </span>
                            {onOpenJustification && !rec.isJustified && (
                              <button
                                type="button"
                                onClick={() => onOpenJustification(rec)}
                                className="mt-1 block text-[10px] text-blue-400 hover:underline cursor-pointer"
                              >
                                Justificar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    ¡Excelente! No se registraron retrasos en la hora de entrada para {selectedCell.rowLabel} el día{' '}
                    {selectedCell.dayName} (100% de puntualidad).
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Recurring Lunes/Viernes Late Employees Box */}
        {recurringDelayEmployees.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Colaboradores con Mayor Recurrencia de Retrasos en Lunes / Viernes:
              </span>
              <span className="text-[11px] text-slate-500">Top 5 Críticos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {recurringDelayEmployees.map((emp, i) => (
                <div
                  key={emp.name}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-[#1F4E79] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        #{i + 1}
                      </span>
                      <span className="text-[10px] text-slate-400">{emp.site}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenEmployeeModal?.(emp.name)}
                      className="text-xs font-bold text-slate-800 hover:text-[#1F4E79] transition-colors text-left line-clamp-1 cursor-pointer"
                    >
                      {emp.name}
                    </button>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Lun: <strong className="text-rose-600">{emp.mondayDelays}</strong> | Vie:{' '}
                      <strong className="text-amber-600">{emp.fridayDelays}</strong>
                    </span>
                    <span className="font-bold text-rose-600">+{emp.totalDelayMins}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
