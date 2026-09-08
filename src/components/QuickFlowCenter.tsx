import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Building2,
  Users,
  Clock,
  Sparkles,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { AttendanceRecord, LoadedFileMeta, GlobalKPIs } from '../types/attendance';
import { downloadSampleTemplate } from '../utils/sampleData';

interface QuickFlowCenterProps {
  records: AttendanceRecord[];
  loadedFiles: LoadedFileMeta[];
  kpis: GlobalKPIs;
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
  onExportFinalExcel: () => void;
  onGoToDetail: () => void;
  onLoadDemoData: () => void;
}

export const QuickFlowCenter: React.FC<QuickFlowCenterProps> = ({
  records,
  loadedFiles,
  kpis,
  onFilesSelected,
  isLoading,
  onExportFinalExcel,
  onGoToDetail,
  onLoadDemoData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasData = records.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-[#132c4a] to-[#0d1e33] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-500/20 mb-6 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Centro de Control Simplificado para Jefes & RRHH
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Flujo de Asistencia en 3 Pasos
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Carga los archivos biométricos de tus sedes (Opeconca, Nalys o UNEFA), valida las alertas en el semáforo y descarga la versión final consolidada para Nómina.
          </p>
        </div>

        {/* Action right */}
        <div className="flex items-center gap-2">
          {!hasData && (
            <button
              type="button"
              onClick={onLoadDemoData}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Cargar Muestra Demo
            </button>
          )}
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6 relative z-10">
        {/* STEP 1: UPLOAD */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
            isDragging
              ? 'bg-blue-600/30 border-blue-400 scale-[1.01]'
              : 'bg-white/5 hover:bg-white/10 border-dashed border-blue-400/40 hover:border-blue-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                1
              </span>
              <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
                Ingesta Multisede
              </span>
            </div>
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-400/30">
                <UploadCloud className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {isLoading ? 'Procesando archivos...' : 'Arrastra aquí tus archivos Excel'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-1">
                Detección automática: Opeconca, Nalys o UNEFA (.xlsx, .xls)
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>{loadedFiles.length} archivo(s) procesado(s)</span>
            <span className="text-blue-300 font-bold hover:underline">Explorar archivos</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* STEP 2: VERIFY SEMAPHORE */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                2
              </span>
              <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                Semáforo de Asistencia
              </span>
            </div>

            {hasData ? (
              <div className="space-y-2.5 my-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Colaboradores
                  </span>
                  <span className="font-bold text-white text-sm">{kpis.totalEmployees}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Horas Netas
                  </span>
                  <span className="font-bold text-emerald-300 text-sm">
                    {kpis.totalNetHours.toFixed(1)} h
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs">
                  <span className="text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Casos Incompletos
                  </span>
                  <span className="font-bold text-amber-300 text-sm">{kpis.totalNeutralCases}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Aún no hay registros cargados para auditar.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Cumplimiento: <strong className="text-white">{hasData ? `${kpis.globalComplianceRate.toFixed(1)}%` : '0%'}</strong>
            </span>
            <button
              type="button"
              onClick={onGoToDetail}
              disabled={!hasData}
              className="text-[11px] text-blue-300 hover:text-blue-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              Auditar casos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* STEP 3: EXPORT FINAL */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900/90 rounded-2xl p-5 border border-emerald-500/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-7 h-7 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                3
              </span>
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                Versión Final Nómina
              </span>
            </div>
            <div className="py-2">
              <h3 className="text-base font-bold text-white">Libro Consolidado Oficial</h3>
              <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed">
                Incluye 4 hojas automáticas: Panel de Control, Resumen por Colaborador, Detalle Diario y Matriz de Parámetros legales.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={onExportFinalExcel}
              disabled={!hasData || isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Descargar Versión Final (.xlsx)</span>
            </button>
            <p className="text-[10.5px] text-center text-emerald-300/80 mt-2">
              ✓ Sanitizado y validado para entrega a Gerencia / RRHH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
