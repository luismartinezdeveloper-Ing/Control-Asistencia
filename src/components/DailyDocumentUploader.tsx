import React, { useState, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { AttendanceRecord, LoadedFileMeta } from '../types/attendance';
import { parseExcelFile } from '../utils/excelParser';
import { downloadSampleTemplate } from '../utils/sampleData';

interface DailyDocumentUploaderProps {
  records: AttendanceRecord[];
  onAddRecordsForDay: (
    newRecords: AttendanceRecord[],
    fileMeta: LoadedFileMeta,
    mode: 'append' | 'replace',
    dayStr: string
  ) => void;
  onRemoveRecordsForDay: (dayStr: string) => void;
}

export const DailyDocumentUploader: React.FC<DailyDocumentUploaderProps> = ({
  records,
  onAddRecordsForDay,
  onRemoveRecordsForDay,
}) => {
  // Current month and year
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 is September (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isForceDate, setIsForceDate] = useState<boolean>(true);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [selectedSiteOverride, setSelectedSiteOverride] = useState<string>('AUTO');
  const [customSiteName, setCustomSiteName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Number of days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Format date string for the selected day: YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const m = (selectedMonth + 1).toString().padStart(2, '0');
    const d = selectedDay.toString().padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  }, [selectedYear, selectedMonth, selectedDay]);

  // Aggregate record counts by day for the selected month
  const dayStatsMap = useMemo(() => {
    const stats: Record<number, { count: number; employees: Set<string>; netHours: number }> = {};
    const prefix = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-`;

    records.forEach((r) => {
      if (r.date && r.date.startsWith(prefix)) {
        const dayNum = parseInt(r.date.split('-')[2], 10);
        if (!stats[dayNum]) {
          stats[dayNum] = { count: 0, employees: new Set(), netHours: 0 };
        }
        stats[dayNum].count += 1;
        stats[dayNum].employees.add(r.employeeName);
        if (!r.isNeutralCase) {
          stats[dayNum].netHours += r.netHours;
        }
      }
    });
    return stats;
  }, [records, selectedYear, selectedMonth]);

  // Records for the currently selected day
  const currentDayRecords = useMemo(() => {
    return records.filter((r) => r.date === selectedDateStr);
  }, [records, selectedDateStr]);

  // Days with data in selected month
  const totalDaysWithData = Object.keys(dayStatsMap).length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await processUploadedFile(file);
    e.target.value = '';
  };

  const processUploadedFile = async (file: File) => {
    setIsProcessing(true);
    setFeedback(null);

    try {
      // Pass overrideDate if forceDate is checked
      const override = isForceDate ? selectedDateStr : undefined;
      const resolvedSite =
        selectedSiteOverride === 'AUTO'
          ? undefined
          : selectedSiteOverride === 'CUSTOM'
          ? customSiteName.trim() || undefined
          : selectedSiteOverride;

      const parseResult = await parseExcelFile(file, override, resolvedSite);

      if (parseResult.records.length === 0) {
        throw new Error('No se encontraron registros de asistencia válidos en el archivo.');
      }

      // If forceDate or resolvedSite is active, apply to all records
      const finalizedRecords = parseResult.records.map((rec) => ({
        ...rec,
        ...(isForceDate ? { date: selectedDateStr } : {}),
        ...(resolvedSite ? { site: resolvedSite } : {}),
      }));

      const detectedSites = Array.from(new Set(finalizedRecords.map((r) => r.site)));

      const fileMeta: LoadedFileMeta = {
        id: `file-${selectedDateStr}-${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        format: parseResult.format,
        recordsCount: finalizedRecords.length,
        loadedAt: new Date(),
        rawRowsCount: parseResult.audit?.totalRawRows,
        headerRowIndex: parseResult.audit?.headerRowIndex,
        uniqueEmployeesCount: parseResult.audit?.uniqueEmployeesCount,
        neutralCasesCount: parseResult.audit?.neutralCasesCount,
        skippedRowsCount: parseResult.audit?.skippedEmptyRows,
        sheetName: parseResult.audit?.sheetName,
        sheetNames: parseResult.audit?.sheetNames,
        detectedColumns: parseResult.audit?.detectedColumns,
        employeeNames: parseResult.audit?.employeeList,
      };

      onAddRecordsForDay(finalizedRecords, fileMeta, uploadMode, selectedDateStr);

      setFeedback({
        text: `¡Éxito! Se cargaron ${finalizedRecords.length} registros para el día ${selectedDateStr} asignados a [${detectedSites.join(', ')}] desde "${file.name}" (${parseResult.formatDescription}). Guardado automáticamente.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo Excel';
      setFeedback({
        text: `Error al procesar archivo: ${msg}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const getDayOfWeekLabel = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return names[d.getDay()];
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  return (
    <div id="daily-uploader-container" className="space-y-6">
      {/* Month & Year Navigation Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1F4E79] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#1F4E79]" />
            <span>Carga de Documentos Diarios por Mes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona el día específico del mes, sube el archivo de asistencia y se guardará automáticamente de forma persistente.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Days of the Month */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Días del Mes: {monthNames[selectedMonth]} {selectedYear} ({totalDaysWithData} de {daysInMonth} días con registros)
          </span>
          <span className="text-xs font-medium text-slate-500">
            Haz clic en cualquier día para cargar o inspeccionar
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-11 gap-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const hasData = Boolean(dayStatsMap[day] && dayStatsMap[day].count > 0);
            const isSelected = selectedDay === day;
            const dayOfWeek = getDayOfWeekLabel(selectedYear, selectedMonth, day);
            const isWeekend = dayOfWeek === 'Sáb' || dayOfWeek === 'Dom';

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center justify-between p-2 rounded-xl text-center border transition-all cursor-pointer min-h-[64px] ${
                  isSelected
                    ? 'border-[#1F4E79] bg-blue-50/80 ring-2 ring-[#1F4E79]/30 shadow-xs'
                    : hasData
                    ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                    : isWeekend
                    ? 'border-slate-100 bg-slate-50/60 hover:border-slate-200 opacity-70'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-semibold ${isWeekend ? 'text-slate-400' : 'text-slate-500'}`}>
                    {dayOfWeek}
                  </span>
                  {hasData && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Contiene registros" />
                  )}
                </div>

                <span
                  className={`text-sm sm:text-base font-bold my-0.5 ${
                    isSelected
                      ? 'text-[#1F4E79]'
                      : hasData
                      ? 'text-emerald-900'
                      : 'text-slate-700'
                  }`}
                >
                  {day.toString().padStart(2, '0')}
                </span>

                <span
                  className={`text-[9px] font-medium leading-tight rounded px-1 ${
                    hasData
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-400'
                  }`}
                >
                  {hasData ? `${dayStatsMap[day].count} reg` : 'Vacío'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Upload & Detail Box */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#1F4E79] text-white text-xs font-bold uppercase tracking-wider">
                Día Seleccionado
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {getDayOfWeekLabel(selectedYear, selectedMonth, selectedDay)}, {selectedDay.toString().padStart(2, '0')} de {monthNames[selectedMonth]} {selectedYear}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fecha normalizada del sistema: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono">{selectedDateStr}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentDayRecords.length > 0 && (
              <button
                type="button"
                onClick={() => onRemoveRecordsForDay(selectedDateStr)}
                className="px-3 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Eliminar registros cargados exclusivamente para este día"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar día ({currentDayRecords.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`my-4 p-3 rounded-lg flex items-start gap-2 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Upload Config & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
          {/* Dropzone & File Input */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#1F4E79] bg-slate-50/70 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-105 shadow-xs transition-transform">
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-[#1F4E79] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-[#1F4E79]" />
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                {isProcessing ? (
                  <span className="flex items-center gap-1.5 justify-center text-blue-700">
                    <Cpu className="w-4 h-4 text-blue-600 animate-pulse" /> Procesando en Web Worker (hilo secundario)...
                  </span>
                ) : (
                  `Cargar documento para el ${selectedDay} de ${monthNames[selectedMonth]}`
                )}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isProcessing ? (
                  'El archivo se está leyendo y analizando de forma asíncrona sin bloquear la interfaz.'
                ) : (
                  'Arrastra aquí el archivo Excel del día (.xlsx, .xls) o haz clic para explorar. Formatos soportados: Opeconca, Nalys, UNEFA.'
                )}
              </p>

              <span className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#1F4E79] group-hover:bg-[#1F4E79] group-hover:text-white transition-colors">
                Examinar archivo
              </span>
            </div>

            {/* Upload Options */}
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={isForceDate}
                    onChange={(e) => setIsForceDate(e.target.checked)}
                    className="rounded border-slate-300 text-[#1F4E79] focus:ring-[#1F4E79]"
                  />
                  <span>Asignar forzosamente la fecha {selectedDateStr} a los registros</span>
                </label>

                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-[11px] font-semibold">Si el día ya tiene datos:</span>
                  <select
                    value={uploadMode}
                    onChange={(e) => setUploadMode(e.target.value as 'append' | 'replace')}
                    className="text-[11px] font-semibold bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer"
                  >
                    <option value="append">Sumar / Anexar registros</option>
                    <option value="replace">Reemplazar existentes</option>
                  </select>
                </div>
              </div>

              {/* Sede Destination Selector */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-slate-700">
                <span className="text-[11px] font-bold text-slate-800">Sede asignada al archivo:</span>
                <select
                  value={selectedSiteOverride}
                  onChange={(e) => setSelectedSiteOverride(e.target.value)}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                >
                  <option value="AUTO">Auto-detectar (Opeconca, Nalys, UNEFA según archivo)</option>
                  <option value="Oficina Opeconca">Oficina Opeconca</option>
                  <option value="Nalys">Nalys</option>
                  <option value="UNEFA">UNEFA</option>
                  <option value="CUSTOM">Otra sede personalizada...</option>
                </select>

                {selectedSiteOverride === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Nombre de la nueva sede..."
                    value={customSiteName}
                    onChange={(e) => setCustomSiteName(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Current Day Status & Records Preview */}
          <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-3">
                <span>Estado del Día {selectedDay}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  currentDayRecords.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentDayRecords.length > 0 ? `${currentDayRecords.length} REGISTRADOS` : 'SIN CARGAS'}
                </span>
              </h4>

              {currentDayRecords.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Colaboradores</span>
                      <span className="text-base font-bold text-slate-900">
                        {new Set(currentDayRecords.map((r) => r.employeeName)).size}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Horas Netas</span>
                      <span className="text-base font-bold text-[#1F4E79]">
                        {currentDayRecords
                          .reduce((acc, r) => acc + (r.isNeutralCase ? 0 : r.netHours), 0)
                          .toFixed(2)}h
                      </span>
                    </div>
                  </div>

                  {/* Sede Badges present on this day */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Sedes cargadas en este día:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(currentDayRecords.map((r) => r.site))).map((site) => {
                        const siteCount = currentDayRecords.filter((r) => r.site === site).length;
                        return (
                          <span
                            key={site}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1F4E79] border border-blue-200"
                          >
                            <span>{site}:</span>
                            <span className="bg-white/80 px-1 rounded text-slate-900">{siteCount}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of collaborators loaded on this day */}
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Personal cargado en este día ({currentDayRecords.length}):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {currentDayRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="bg-white px-2.5 py-1.5 rounded border border-slate-200/80 text-[11px] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 block leading-tight">
                              {rec.employeeName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {rec.site} • {rec.earliestTime} - {rec.latestTime}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              rec.status === 'SUPERAVIT'
                                ? 'bg-blue-100 text-blue-800'
                                : rec.status === 'DEFICIT'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'NEUTRAL'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rec.isNeutralCase ? 'Neutral' : `${rec.netHours}h`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-600">
                    No hay documentos cargados para el día {selectedDay} de {monthNames[selectedMonth]}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sube el reporte biométrico correspondiente a este día laboral para consolidarlo.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Templates bar */}
            <div className="pt-3 border-t border-slate-200/70 mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Descargar plantilla de prueba:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('OPECONCA')}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Opeconca
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('NALYS')}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Nalys
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('UNEFA')}
                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  UNEFA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
