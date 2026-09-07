import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarRange,
  CalendarDays,
  Clock,
  Filter,
  Check,
  RotateCcw,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, PeriodFilterMode, PeriodFilterState } from '../types/attendance';
import {
  formatDateSpanish,
  getWeekRangeForDate,
  getFortnightRangeForDate,
  getMonthRangeForDate,
} from '../utils/timeUtils';

interface GlobalPeriodFilterProps {
  records: AttendanceRecord[];
  periodState: PeriodFilterState;
  onPeriodChange: (state: PeriodFilterState) => void;
  filteredCount: number;
}

export const GlobalPeriodFilter: React.FC<GlobalPeriodFilterProps> = ({
  records,
  periodState,
  onPeriodChange,
  filteredCount,
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(periodState.mode === 'CUSTOM');
  const [customStart, setCustomStart] = useState(periodState.customStartDate || periodState.startDate);
  const [customEnd, setCustomEnd] = useState(periodState.customEndDate || periodState.endDate);

  // Extract all unique sorted dates available in records
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.date).filter(Boolean))).sort();
  }, [records]);

  const earliestRegistered = uniqueDates[0] || '';
  const latestRegistered = uniqueDates[uniqueDates.length - 1] || '';

  // Calculate descriptive active label
  const activeLabel = useMemo(() => {
    if (periodState.mode === 'ALL') {
      return `Todo el Histórico (${uniqueDates.length} días registrados)`;
    }
    if (periodState.mode === 'LATEST') {
      return `Último Día: ${formatDateSpanish(periodState.startDate, true)}`;
    }
    if (periodState.mode === 'WEEK') {
      return getWeekRangeForDate(periodState.anchorDate || latestRegistered).label;
    }
    if (periodState.mode === 'FORTNIGHT') {
      return getFortnightRangeForDate(periodState.anchorDate || latestRegistered).label;
    }
    if (periodState.mode === 'MONTH') {
      return getMonthRangeForDate(periodState.anchorDate || latestRegistered).label;
    }
    if (periodState.mode === 'CUSTOM') {
      if (periodState.startDate === periodState.endDate) {
        return `Día específico: ${formatDateSpanish(periodState.startDate, true)}`;
      }
      return `${formatDateSpanish(periodState.startDate)} al ${formatDateSpanish(periodState.endDate)}`;
    }
    return '';
  }, [periodState, uniqueDates, latestRegistered]);

  // Handlers for switching preset modes
  const handleSelectMode = (mode: PeriodFilterMode) => {
    const anchor = latestRegistered || new Date().toISOString().slice(0, 10);

    if (mode === 'ALL') {
      setShowCustomInputs(false);
      onPeriodChange({
        mode: 'ALL',
        startDate: earliestRegistered || anchor,
        endDate: latestRegistered || anchor,
        anchorDate: anchor,
      });
      return;
    }

    if (mode === 'LATEST') {
      setShowCustomInputs(false);
      onPeriodChange({
        mode: 'LATEST',
        startDate: latestRegistered || anchor,
        endDate: latestRegistered || anchor,
        anchorDate: latestRegistered || anchor,
      });
      return;
    }

    if (mode === 'WEEK') {
      setShowCustomInputs(false);
      const week = getWeekRangeForDate(anchor);
      onPeriodChange({
        mode: 'WEEK',
        startDate: week.startDate,
        endDate: week.endDate,
        anchorDate: anchor,
      });
      return;
    }

    if (mode === 'FORTNIGHT') {
      setShowCustomInputs(false);
      const fort = getFortnightRangeForDate(anchor);
      onPeriodChange({
        mode: 'FORTNIGHT',
        startDate: fort.startDate,
        endDate: fort.endDate,
        anchorDate: anchor,
      });
      return;
    }

    if (mode === 'MONTH') {
      setShowCustomInputs(false);
      const month = getMonthRangeForDate(anchor);
      onPeriodChange({
        mode: 'MONTH',
        startDate: month.startDate,
        endDate: month.endDate,
        anchorDate: anchor,
      });
      return;
    }

    if (mode === 'CUSTOM') {
      setShowCustomInputs(true);
      const start = customStart || earliestRegistered || anchor;
      const end = customEnd || latestRegistered || anchor;
      onPeriodChange({
        mode: 'CUSTOM',
        startDate: start,
        endDate: end,
        anchorDate: anchor,
        customStartDate: start,
        customEndDate: end,
      });
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    onPeriodChange({
      mode: 'CUSTOM',
      startDate: start,
      endDate: end,
      anchorDate: end,
      customStartDate: start,
      customEndDate: end,
    });
  };

  const handleSelectSingleDate = (date: string) => {
    setShowCustomInputs(true);
    setCustomStart(date);
    setCustomEnd(date);
    onPeriodChange({
      mode: 'CUSTOM',
      startDate: date,
      endDate: date,
      anchorDate: date,
      customStartDate: date,
      customEndDate: date,
    });
  };

  if (records.length === 0) return null;

  return (
    <section
      id="global-period-filter-bar"
      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5 transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Indicator title and Active Span */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#1F4E79] border border-blue-100 flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Filtro Temporal Unificado
              </span>
              {periodState.mode !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-[#1F4E79] border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F4E79] animate-pulse" />
                  Período Acotado
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {activeLabel}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                ({filteredCount} {filteredCount === 1 ? 'jornada' : 'jornadas'} de {records.length})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Preset Period Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleSelectMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodState.mode === 'ALL'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Todo ({uniqueDates.length}d)
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('LATEST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              periodState.mode === 'LATEST'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title={`Filtrar solo el último día cargado (${latestRegistered})`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Último Día</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('WEEK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodState.mode === 'WEEK'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Semana
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('FORTNIGHT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodState.mode === 'FORTNIGHT'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Quincena
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodState.mode === 'MONTH'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Mes
          </button>

          <button
            type="button"
            onClick={() => {
              if (showCustomInputs && periodState.mode === 'CUSTOM') {
                setShowCustomInputs(false);
                handleSelectMode('ALL');
              } else {
                handleSelectMode('CUSTOM');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              periodState.mode === 'CUSTOM'
                ? 'bg-[#1F4E79] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Rango libre</span>
          </button>

          {periodState.mode !== 'ALL' && (
            <button
              type="button"
              onClick={() => handleSelectMode('ALL')}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Restablecer filtro a todo el histórico"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Custom Date Picker bar if Custom mode is on */}
      {showCustomInputs && (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#1F4E79]" />
              <span>Intervalo de Fechas:</span>
            </span>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500 font-medium">Desde:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                min={earliestRegistered}
                max={latestRegistered}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1F4E79]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500 font-medium">Hasta:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={earliestRegistered}
                max={latestRegistered}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1F4E79]"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-3 py-1 bg-[#1F4E79] hover:bg-[#163857] text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Aplicar Intervalo
            </button>
          </div>

          <span className="text-[11px] text-slate-500">
            Rango registrado: <strong className="font-mono text-slate-700">{earliestRegistered}</strong> al{' '}
            <strong className="font-mono text-slate-700">{latestRegistered}</strong>
          </span>
        </div>
      )}

      {/* Quick single-day jump chips */}
      {uniqueDates.length > 1 && (
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Saltar a día:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {uniqueDates.map((date) => {
              const isSelected =
                periodState.startDate === date && periodState.endDate === date;
              const dateCount = records.filter((r) => r.date === date).length;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleSelectSingleDate(date)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={`${date}: ${dateCount} jornadas`}
                >
                  <span>{date}</span>
                  <span
                    className={`text-[10px] px-1 rounded-sm ${
                      isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {dateCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
