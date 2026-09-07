import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Factory,
  GraduationCap,
  Sparkles,
  Download,
  Info,
  Cpu,
} from 'lucide-react';
import { LoadedFileMeta } from '../types/attendance';
import { downloadSampleTemplate } from '../utils/sampleData';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
  loadedFiles: LoadedFileMeta[];
  onLoadDemoData: () => void;
  hasData: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  isLoading,
  loadedFiles,
  onLoadDemoData,
  hasData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMsg(null);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    processFiles(droppedFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      processFiles(selected);
      e.target.value = ''; // Reset input to allow re-selecting same file
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv');
    });

    if (validFiles.length === 0) {
      setErrorMsg('Por favor selecciona únicamente archivos en formato Excel (.xlsx, .xls).');
      return;
    }

    onFilesSelected(validFiles);
  };

  return (
    <section
      id="upload-section"
      className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-full transition-all"
    >
      <div>
        {/* Header Info */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#1F4E79]" />
            <span>Carga de Asistencia</span>
          </h2>

          {/* Templates download helper */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-semibold uppercase hidden sm:inline">Plantillas:</span>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('OPECONCA')}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 font-medium transition-colors cursor-pointer"
              title="Descargar plantilla Opeconca"
            >
              Ope
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('NALYS')}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 font-medium transition-colors cursor-pointer"
              title="Descargar plantilla Nalys"
            >
              Nal
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('UNEFA')}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 font-medium transition-colors cursor-pointer"
              title="Descargar plantilla UNEFA"
            >
              Une
            </button>
          </div>
        </div>

        {/* Main Drag and Drop Box */}
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center bg-gray-50/70 group ${
            isDragging
              ? 'border-[#1F4E79] bg-blue-50/60 scale-[1.01]'
              : 'border-gray-300 hover:border-[#1F4E79] hover:bg-blue-50/30'
          } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            id="file-upload-input"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-11 h-11 bg-white rounded-full border border-gray-200 flex items-center justify-center mb-2.5 group-hover:bg-blue-50 shadow-xs transition-colors">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#1F4E79] border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5 text-gray-400 group-hover:text-[#1F4E79] transition-colors" />
            )}
          </div>

          <p className="text-xs sm:text-sm font-bold text-gray-700">
            {isLoading ? 'Procesando en hilo secundario (Web Worker)...' : 'Suelte sus archivos Excel aquí'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                <Cpu className="w-3 h-3 text-blue-600 animate-pulse" /> Hilo principal 100% fluido
              </span>
            ) : (
              '(Opeconca, Nalys o UNEFA - Carga asíncrona Web Worker)'
            )}
          </p>

          <button
            type="button"
            className="mt-3 text-[11px] font-bold text-[#1F4E79] border border-[#1F4E79] px-3 py-1 rounded hover:bg-[#1F4E79] hover:text-white transition-colors"
          >
            Explorar archivos
          </button>

          {!hasData && !isLoading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemoData();
              }}
              className="mt-2 text-[10px] text-amber-800 font-semibold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Cargar datos de demostración</span>
            </button>
          )}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            id="upload-error"
            className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-1.5 text-xs text-red-700"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bento Bottom: Lógica de Horas box */}
      <div className="mt-4 p-3 bg-blue-50/80 border border-blue-100 rounded-lg">
        <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>Lógica de Horas Institucional</span>
          <span className="text-[9px] text-blue-600 font-normal">Automático</span>
        </p>
        <ul className="text-[11px] text-blue-800/90 space-y-0.5">
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F4E79]"></span>
            <span>Jornada base: <strong>8.00 h netas</strong> / Almuerzo: <strong>-1.5h</strong></span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F4E79]"></span>
            <span>Horario ref: <strong>08:00 AM - 05:30 PM</strong></span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F4E79]"></span>
            <span>Neutrales: Una sola marca (sin déficit)</span>
          </li>
        </ul>
      </div>
    </section>
  );
};
