import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Settings2,
  Building2,
  Sparkles,
  Calendar,
  X,
  Layers,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { exportDetailedAttendanceExcel } from '../utils/excelExporter';

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  currentPeriodLabel?: string;
  defaultSiteFilter?: string;
}

export const AttendanceExportModal: React.FC<AttendanceExportModalProps> = ({
  isOpen,
  onClose,
  records,
  currentPeriodLabel = 'Período Activo',
  defaultSiteFilter = 'ALL',
}) => {
  const [exportMode, setExportMode] = useState<'AUDITED' | 'RAW'>('AUDITED');
  const [siteFilter, setSiteFilter] = useState<string>(defaultSiteFilter);
  const [includeSummarySheet, setIncludeSummarySheet] = useState<boolean>(true);

  // Available unique sites
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.site) set.add(r.site);
    });
    return Array.from(set);
  }, [records]);

  // Filter records based on site selection
  const filteredRecords = useMemo(() => {
    if (siteFilter !== 'ALL') {
      return records.filter((r) => r.site === siteFilter);
    }
    return records;
  }, [records, siteFilter]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    if (filteredRecords.length === 0) return;

    const fileSuffix =
      siteFilter === 'ALL'
        ? 'Consolidado'
        : siteFilter.replace(/[\s/\\:]+/g, '_');

    const modeTag = exportMode === 'RAW' ? 'Plano' : 'Detallado';
    const dateTag = currentPeriodLabel.replace(/[\s/\\:]+/g, '_');

    exportDetailedAttendanceExcel(filteredRecords, {
      customFileName: `Reporte_Asistencia_${modeTag}_${fileSuffix}_${dateTag}.xlsx`,
      includeAuditColumns: exportMode === 'AUDITED',
      includeSummarySheet: includeSummarySheet,
      dateLabel: currentPeriodLabel,
      sheetName: 'Reporte_Asistencia',
    });

    onClose();
  };

  const auditedColumns = [
    'Grabar fecha',
    'Apellido y Nombre',
    'Departamento',
    'Hora más temprana',
    'última Hora',
    'Permanencia Bruta (h)',
    'Deducción Almuerzo (h)',
    'Horas Netas (h)',
    'Jornada Exigible (h)',
    'Diferencia / Balance (h)',
    'Estado',
    'Observaciones / Justificación',
  ];

  const rawColumns = [
    'Grabar fecha',
    'Apellido y Nombre',
    'Departamento',
    'Hora más temprana',
    'última Hora',
  ];

  const currentColumns = exportMode === 'AUDITED' ? auditedColumns : rawColumns;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1F4E79] to-[#2e75b6] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Configuración de Reporte de Asistencia</h3>
                <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/30">
                  Excel (.xlsx)
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Genera el reporte con la estructura de marcaciones, deducción de almuerzo y balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Format Selector Cards */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
              1. Formato y Columnas del Reporte
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Audited */}
              <button
                type="button"
                onClick={() => setExportMode('AUDITED')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  exportMode === 'AUDITED'
                    ? 'border-[#1F4E79] bg-blue-50/70 shadow-xs ring-1 ring-[#1F4E79]/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-[#1F4E79]">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">Reporte Detallado con Auditoría</span>
                  </div>
                  {exportMode === 'AUDITED' && (
                    <CheckCircle2 className="w-5 h-5 text-[#1F4E79] shrink-0" />
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-[#1F4E79]">12 Columnas completas</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Incluye Grabar fecha, Nombres, Departamento, Hora temprana y última + Permanencia Bruta, Deducción 1.5h Almuerzo, Horas Netas, Balance, Estado y Justificaciones.
                  </p>
                </div>
                <span className="inline-block mt-2 bg-blue-100 text-[#1F4E79] text-[10px] font-bold px-2 py-0.5 rounded">
                  Recomendado para RRHH y Nómina
                </span>
              </button>

              {/* Option B: Raw */}
              <button
                type="button"
                onClick={() => setExportMode('RAW')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  exportMode === 'RAW'
                    ? 'border-[#1F4E79] bg-blue-50/70 shadow-xs ring-1 ring-[#1F4E79]/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                      <FileCheck className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">Reporte Plano de Marcaciones</span>
                  </div>
                  {exportMode === 'RAW' && (
                    <CheckCircle2 className="w-5 h-5 text-[#1F4E79] shrink-0" />
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">5 columnas base de marcación</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Grabar fecha, Apellido y Nombre, Departamento, Hora más temprana y última Hora. Estructura directa para archivo o cotejo plano.
                  </p>
                </div>
                <span className="inline-block mt-2 bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                  Formato Plano
                </span>
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
              2. Alcance y Filtro de Sede
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setSiteFilter('ALL')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  siteFilter === 'ALL'
                    ? 'border-[#1F4E79] bg-blue-50/50 text-slate-900 ring-1 ring-[#1F4E79]/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#1F4E79]" />
                  <div>
                    <span className="text-xs font-bold block">Todas las sedes (Consolidado)</span>
                    <span className="text-[10px] text-slate-500">
                      Incluir toda la muestra activa ({records.length} registros)
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="siteScope"
                  checked={siteFilter === 'ALL'}
                  onChange={() => setSiteFilter('ALL')}
                  className="accent-[#1F4E79]"
                />
              </div>

              {/* Specific Site selector if sites exist */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">Filtrar por sede específica:</span>
                  </div>
                  {siteFilter !== 'ALL' && (
                    <span className="text-[10px] font-bold text-[#1F4E79] bg-blue-50 px-1.5 py-0.5 rounded">
                      {filteredRecords.length} reg.
                    </span>
                  )}
                </div>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                >
                  <option value="ALL">-- Ver todas las sedes --</option>
                  {availableSites.map((s) => (
                    <option key={s} value={s}>
                      {s} ({records.filter((r) => r.site === s).length} registros)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Options: Summary Sheet */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                id="chk-include-summary"
                type="checkbox"
                checked={includeSummarySheet}
                onChange={(e) => setIncludeSummarySheet(e.target.checked)}
                className="w-4 h-4 text-[#1F4E79] rounded border-slate-300 focus:ring-[#1F4E79] accent-[#1F4E79]"
              />
              <label htmlFor="chk-include-summary" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Incluir pestaña secundaria de Resumen Ejecutivo y Balance Horario
              </label>
            </div>
            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Hoja: Resumen_Ejecutivo
            </span>
          </div>

          {/* Columns Preview */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Columnas en el archivo Excel ({currentColumns.length} columnas)
              </span>
              <span className="text-[10px] text-blue-300 font-mono">Hoja: Reporte_Asistencia</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {currentColumns.map((col, idx) => (
                <span
                  key={col}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    idx < 5
                      ? 'bg-blue-950 text-blue-300 border border-blue-700/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <span>Registros a incluir en el reporte: </span>
            <strong className="text-slate-900 font-bold">{filteredRecords.length} líneas</strong>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={filteredRecords.length === 0}
              className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                filteredRecords.length > 0
                  ? 'bg-[#1F4E79] hover:bg-[#183e60] text-white shadow-blue-950/20 active:scale-[0.98]'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Reporte de Asistencia (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Backward compatibility alias
 */
export const NalysExportModal = AttendanceExportModal;

