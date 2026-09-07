import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Clock,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { formatDateSpanish, parseDateParts, MONTH_SHORT_ES } from '../utils/timeUtils';

interface ExecutiveAttendanceTrendChartProps {
  records: AttendanceRecord[];
  onOpenEmployeeModal?: (employeeName: string) => void;
  onOpenJustification?: (record: AttendanceRecord) => void;
}

type ChartViewMode = 'distribution' | 'absenteeism' | 'hours';

interface DailyTrendItem {
  date: string;
  dayShort: string;
  dayFull: string;
  totalScheduled: number;
  presentCount: number;
  completedCount: number;
  deficitCount: number;
  absentCount: number;
  justifiedCount: number;
  neutralCount: number;
  attendanceRate: number;
  netHours: number;
  scheduledHours: number;
  absentEmployees: AttendanceRecord[];
  justifiedEmployees: AttendanceRecord[];
  deficitEmployees: AttendanceRecord[];
}

export const ExecutiveAttendanceTrendChart: React.FC<ExecutiveAttendanceTrendChartProps> = ({
  records,
  onOpenEmployeeModal,
  onOpenJustification,
}) => {
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('distribution');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Available unique sites
  const uniqueSites = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.site) set.add(r.site);
    }
    return Array.from(set).sort();
  }, [records]);

  // Filter records by selected site
  const siteFilteredRecords = useMemo(() => {
    if (selectedSite === 'ALL') return records;
    return records.filter((r) => r.site === selectedSite);
  }, [records, selectedSite]);

  // Compute daily trend data for the last 7 distinct operating dates (or current week)
  const trendData = useMemo(() => {
    if (siteFilteredRecords.length === 0) return [];

    // Group by date
    const dateMap = new Map<string, AttendanceRecord[]>();
    for (const r of siteFilteredRecords) {
      if (!r.date) continue;
      const list = dateMap.get(r.date) || [];
      list.push(r);
      dateMap.set(r.date, list);
    }

    // Sort dates ascending
    const sortedDates = Array.from(dateMap.keys()).sort();
    // Take the last 7 days of activity to represent the recent operating week
    const recentDates = sortedDates.slice(-7);

    const DAY_SHORT_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const result: DailyTrendItem[] = recentDates.map((d) => {
      const dayRecords = dateMap.get(d) || [];
      const parts = parseDateParts(d);
      let dayShort = d;
      let dayFull = d;

      if (parts) {
        const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        const dayIdx = utc.getUTCDay();
        const shortName = DAY_SHORT_NAMES[dayIdx];
        const monthShort = MONTH_SHORT_ES[parts.month - 1];
        dayShort = `${shortName} ${parts.day}`;
        dayFull = formatDateSpanish(d, true);
      }

      let completedCount = 0;
      let deficitCount = 0;
      let absentCount = 0;
      let justifiedCount = 0;
      let neutralCount = 0;
      let netHours = 0;
      let scheduledHours = 0;

      const absentEmployees: AttendanceRecord[] = [];
      const justifiedEmployees: AttendanceRecord[] = [];
      const deficitEmployees: AttendanceRecord[] = [];

      for (const r of dayRecords) {
        netHours += r.netHours || 0;
        scheduledHours += r.scheduledHours || 0;

        if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
          absentCount++;
          absentEmployees.push(r);
        } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
          justifiedCount++;
          justifiedEmployees.push(r);
        } else if (r.isNeutralCase || r.status === 'NEUTRAL') {
          neutralCount++;
        } else if (r.status === 'DEFICIT') {
          deficitCount++;
          deficitEmployees.push(r);
        } else {
          // CUMPLIDO or SUPERAVIT
          completedCount++;
        }
      }

      const totalScheduled = dayRecords.length;
      // Present = Completed + Deficit + Neutral
      const presentCount = completedCount + deficitCount + neutralCount;
      const attendanceRate = totalScheduled > 0 ? Math.round((presentCount / totalScheduled) * 100) : 0;

      return {
        date: d,
        dayShort,
        dayFull,
        totalScheduled,
        presentCount,
        completedCount,
        deficitCount,
        absentCount,
        justifiedCount,
        neutralCount,
        attendanceRate,
        netHours: Math.round(netHours * 10) / 10,
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        absentEmployees,
        justifiedEmployees,
        deficitEmployees,
      };
    });

    return result;
  }, [siteFilteredRecords]);

  // Overall Weekly Trend Metrics & Insights
  const insights = useMemo(() => {
    if (trendData.length === 0) {
      return {
        avgAttendanceRate: 0,
        totalAbsences: 0,
        totalJustified: 0,
        worstDay: null as DailyTrendItem | null,
        bestDay: null as DailyTrendItem | null,
        lostHours: 0,
        absenteeismPatternNote: 'Sin datos en el período seleccionado.',
      };
    }

    const totalDays = trendData.length;
    const sumRate = trendData.reduce((acc, cur) => acc + cur.attendanceRate, 0);
    const avgAttendanceRate = Math.round(sumRate / totalDays);

    const totalAbsences = trendData.reduce((acc, cur) => acc + cur.absentCount, 0);
    const totalJustified = trendData.reduce((acc, cur) => acc + cur.justifiedCount, 0);
    const lostHours = trendData.reduce((acc, cur) => acc + cur.absentCount * 8.0, 0);

    // Identify day with highest absenteeism
    const sortedByAbsence = [...trendData].sort((a, b) => b.absentCount - a.absentCount);
    const worstDay = sortedByAbsence[0]?.absentCount > 0 ? sortedByAbsence[0] : null;

    // Identify day with best attendance
    const sortedByAttendance = [...trendData].sort((a, b) => b.attendanceRate - a.attendanceRate);
    const bestDay = sortedByAttendance[0] || null;

    // Detect pattern
    let absenteeismPatternNote = 'Asistencia estable y continua a lo largo de los días registrados.';
    if (worstDay && worstDay.absentCount > 0) {
      const pctOfTotalAbsences = Math.round((worstDay.absentCount / (totalAbsences || 1)) * 100);
      absenteeismPatternNote = `El día ${worstDay.dayFull} concentró ${worstDay.absentCount} inasistencias (${pctOfTotalAbsences}% del total semanal).`;
    }

    return {
      avgAttendanceRate,
      totalAbsences,
      totalJustified,
      worstDay,
      bestDay,
      lostHours,
      absenteeismPatternNote,
    };
  }, [trendData]);

  // Currently inspected day (defaults to worst day with absences or latest day)
  const activeDayDetail = useMemo(() => {
    if (trendData.length === 0) return null;
    if (selectedDayDate) {
      const found = trendData.find((d) => d.date === selectedDayDate);
      if (found) return found;
    }
    // Default to worst day with absences, or the last date in series
    return insights.worstDay || trendData[trendData.length - 1];
  }, [trendData, selectedDayDate, insights.worstDay]);

  if (records.length === 0) {
    return null;
  }

  return (
    <section
      id="executive-attendance-trend-section"
      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79] border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tendencia de Asistencia Diaria y Patrones de Ausentismo
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              Última Semana Operativa ({trendData.length} días)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitorea la evolución diaria de asistencia, detección temprana de días críticos de inasistencia y balance de personal.
          </p>
        </div>

        {/* View Mode & Sede Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sede selector */}
          {uniqueSites.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Filtrar por sede en gráfico"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todas las Sedes</option>
                {uniqueSites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visualization mode pills */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setChartViewMode('distribution')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'distribution'
                  ? 'bg-white text-[#1F4E79] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Distribución Diaria
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('absenteeism')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'absenteeism'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Foco en Ausencias
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('hours')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'hours'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Horas Netas
            </button>
          </div>
        </div>
      </div>

      {/* 4 Smart KPI Diagnostic Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Tasa de Asistencia Semanal */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Asistencia Promedio
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">
                {insights.avgAttendanceRate}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  insights.avgAttendanceRate >= 92
                    ? 'bg-emerald-100 text-emerald-800'
                    : insights.avgAttendanceRate >= 85
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {insights.avgAttendanceRate >= 92 ? 'Saludable' : 'Requiere Atención'}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: Día Crítico de Ausentismo */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Día Mayor Ausentismo
            </span>
            <div className="mt-0.5">
              {insights.worstDay && insights.worstDay.absentCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-rose-700">
                    {insights.worstDay.dayShort}
                  </span>
                  <span className="text-xs font-semibold text-rose-600">
                    ({insights.worstDay.absentCount} inasistencias)
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-emerald-700">Sin picos de faltas</span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Total Inasistencias vs Justificadas */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Inasistencias / Justificadas
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-rose-600">
                {insights.totalAbsences}
              </span>
              <span className="text-xs text-slate-500 font-medium">sin justificar</span>
              <span className="text-xs text-blue-600 font-bold ml-1">
                • {insights.totalJustified} justif.
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <UserX className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 4: Impacto Horario */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Horas no Laboradas
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-800">
                {insights.lostHours.toFixed(1)}h
              </span>
              <span className="text-[11px] text-slate-500">por ausencias</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'distribution' ? (
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload as DailyTrendItem;
                    if (payload && payload.date) {
                      setSelectedDayDate(payload.date);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="dayShort"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  label={{
                    value: 'Colaboradores',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 10,
                    offset: 30,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: '#059669', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#a7f3d0' }}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip content={<CustomAttendanceTooltip />} />
                <ReferenceLine
                  yAxisId="right"
                  y={90}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Meta 90%',
                    position: 'insideTopRight',
                    fill: '#059669',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                {/* Stacked Bars for Personnel Distribution */}
                <Bar
                  yAxisId="left"
                  dataKey="completedCount"
                  name="Asistencia Completa (8h+)"
                  stackId="personnel"
                  fill="#1F4E79"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  yAxisId="left"
                  dataKey="deficitCount"
                  name="Asistencia con Déficit"
                  stackId="personnel"
                  fill="#F59E0B"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  yAxisId="left"
                  dataKey="justifiedCount"
                  name="Justificados / Permisos"
                  stackId="personnel"
                  fill="#38BDF8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  yAxisId="left"
                  dataKey="absentCount"
                  name="Inasistencias No Justificadas"
                  stackId="personnel"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
                {/* Attendance Rate Line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendanceRate"
                  name="% Asistencia"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            ) : viewMode === 'absenteeism' ? (
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload as DailyTrendItem;
                    if (payload && payload.date) {
                      setSelectedDayDate(payload.date);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="dayShort"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  label={{
                    value: 'Casos Registrados',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 10,
                    offset: 30,
                  }}
                />
                <Tooltip content={<CustomAttendanceTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="absentCount"
                  name="Inasistencias Injustificadas"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  yAxisId="left"
                  dataKey="justifiedCount"
                  name="Inasistencias Justificadas"
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  yAxisId="left"
                  dataKey="deficitCount"
                  name="Jornadas con Déficit"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload as DailyTrendItem;
                    if (payload && payload.date) {
                      setSelectedDayDate(payload.date);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="dayShort"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip content={<CustomAttendanceTooltip />} />
                <Bar
                  dataKey="netHours"
                  name="Horas Netas Entregadas"
                  fill="#1F4E79"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  type="monotone"
                  dataKey="scheduledHours"
                  name="Horas Base Programadas"
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#64748B' }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200/80 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#1F4E79]" /> Presentes / Cumplidos
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#F59E0B]" /> Con Déficit Horario
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#38BDF8]" /> Justificados
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#EF4444]" /> Inasistencias
            </span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-3.5 h-1 bg-[#10B981] rounded-full" /> % Asistencia
            </span>
          </div>

          <span className="text-slate-400 text-[11px] italic">
            * Haz clic en una columna del gráfico para inspeccionar el día
          </span>
        </div>
      </div>

      {/* Selected Day Diagnostic Detail Panel */}
      {activeDayDetail && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1F4E79]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Diagnóstico del Día: <span className="text-[#1F4E79]">{activeDayDetail.dayFull}</span>
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeDayDetail.attendanceRate >= 92
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {activeDayDetail.attendanceRate}% Asistencia ({activeDayDetail.presentCount}/{activeDayDetail.totalScheduled})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                Horas Netas: <strong>{activeDayDetail.netHours}h</strong> / {activeDayDetail.scheduledHours}h
              </span>
            </div>
          </div>

          {/* Absence and Justification breakdown cards for the selected day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Inasistencias Sin Justificar */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5" />
                  Inasistencias Sin Justificar ({activeDayDetail.absentEmployees.length})
                </span>
                {activeDayDetail.absentEmployees.length === 0 && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Sin faltas
                  </span>
                )}
              </div>

              {activeDayDetail.absentEmployees.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeDayDetail.absentEmployees.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-1.5 rounded bg-rose-50/50 hover:bg-rose-50 border border-rose-100 text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                          className="font-bold text-slate-800 hover:text-[#1F4E79] truncate block text-left cursor-pointer"
                        >
                          {rec.employeeName}
                        </button>
                        <span className="text-[10px] text-slate-500 block">
                          {rec.department || rec.site}
                        </span>
                      </div>

                      {onOpenJustification && (
                        <button
                          type="button"
                          onClick={() => onOpenJustification(rec)}
                          className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded border border-rose-200 shrink-0 transition-colors cursor-pointer"
                          title="Adjuntar justificativo"
                        >
                          Justificar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 py-1">
                  Todos los colaboradores convocados se presentaron a laborar.
                </p>
              )}
            </div>

            {/* Inasistencias Justificadas / Permisos */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Inasistencias Justificadas ({activeDayDetail.justifiedEmployees.length})
                </span>
                {activeDayDetail.justifiedEmployees.length === 0 && (
                  <span className="text-[10px] text-slate-400">0 permisos</span>
                )}
              </div>

              {activeDayDetail.justifiedEmployees.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeDayDetail.justifiedEmployees.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-1.5 rounded bg-blue-50/50 border border-blue-100 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeModal?.(rec.employeeName)}
                          className="font-bold text-slate-800 hover:text-[#1F4E79] truncate block text-left cursor-pointer"
                        >
                          {rec.employeeName}
                        </button>
                        <span className="text-[10px] text-blue-700 font-medium block">
                          {rec.justificationReason || 'Permiso Autorizado'}
                        </span>
                      </div>

                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                        Amparado
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 py-1">
                  No se registraron ausencias con justificación o reposo en esta jornada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Custom Recharts Tooltip Component
const CustomAttendanceTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    payload: DailyTrendItem;
  }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as DailyTrendItem;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[220px] backdrop-blur-sm z-50">
      <div className="border-b border-slate-700 pb-1.5 flex items-center justify-between">
        <div>
          <span className="font-bold text-white block">{data.dayFull}</span>
          <span className="text-[10px] text-slate-400">{data.date}</span>
        </div>
        <span
          className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
            data.attendanceRate >= 90
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {data.attendanceRate}%
        </span>
      </div>

      <div className="space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-300">
          <span>Plantilla convocada:</span>
          <strong className="text-white">{data.totalScheduled} personas</strong>
        </div>
        <div className="flex items-center justify-between text-emerald-400">
          <span>Asistencia Completa:</span>
          <strong>{data.completedCount}</strong>
        </div>
        {data.deficitCount > 0 && (
          <div className="flex items-center justify-between text-amber-400">
            <span>Con Déficit Horario:</span>
            <strong>{data.deficitCount}</strong>
          </div>
        )}
        {data.justifiedCount > 0 && (
          <div className="flex items-center justify-between text-sky-400">
            <span>Justificados / Reposos:</span>
            <strong>{data.justifiedCount}</strong>
          </div>
        )}
        {data.absentCount > 0 && (
          <div className="flex items-center justify-between text-rose-400 font-bold">
            <span>Inasistencias sin justificar:</span>
            <strong>{data.absentCount}</strong>
          </div>
        )}
      </div>

      <div className="pt-1.5 border-t border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Horas Netas:</span>
        <span className="font-mono font-bold text-slate-200">
          {data.netHours}h / {data.scheduledHours}h
        </span>
      </div>
    </div>
  );
};
