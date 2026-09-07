import React, { useState, useEffect } from 'react';
import {
  X,
  UserX,
  FileCheck2,
  AlertTriangle,
  Calendar,
  Building,
  User,
  Clock,
  FileText,
  ShieldCheck,
  Check,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types/attendance';
import {
  OFFICIAL_START_TIME,
  OFFICIAL_END_TIME,
  SCHEDULED_DAILY_HOURS,
  LUNCH_DEDUCTION_HOURS,
  calculateAttendanceHours,
} from '../utils/timeUtils';

export interface AbsenceJustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: AttendanceRecord | null;
  initialData?: {
    employeeName: string;
    department?: string;
    site?: string;
    date: string;
  } | null;
  onSaveAbsence: (record: AttendanceRecord, message: string) => void;
  onDeleteRecord?: (recordId: string) => void;
}

const COMMON_JUSTIFICATION_REASONS = [
  'Reposo Médico / Incapacidad IVSS o Privada',
  'Permiso Personal Aprobado por Jefatura',
  'Comisión de Servicio / Gestión en Terreno',
  'Calamidad Doméstica / Duelo Familiar',
  'Vacaciones / Día Compensatorio',
  'Trámite Institucional / Formación',
  'Suspensión de Actividades / Día No Laborable',
  'Otro Motivo Justificado',
];

export const AbsenceJustificationModal: React.FC<AbsenceJustificationModalProps> = ({
  isOpen,
  onClose,
  record,
  initialData,
  onSaveAbsence,
}) => {
  // Mode: 'UNJUSTIFIED' (Inasistencia) | 'JUSTIFIED' (Justificado) | 'ATTENDED' (Regularizar asistencia)
  const [absenceMode, setAbsenceMode] = useState<'UNJUSTIFIED' | 'JUSTIFIED' | 'ATTENDED'>('UNJUSTIFIED');
  
  // Justification fields
  const [justificationReason, setJustificationReason] = useState<string>(COMMON_JUSTIFICATION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [documentSupport, setDocumentSupport] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Regular attendance fallback fields
  const [entryTime, setEntryTime] = useState<string>(OFFICIAL_START_TIME);
  const [exitTime, setExitTime] = useState<string>(OFFICIAL_END_TIME);

  // Sync state whenever record or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (record) {
      if (record.status === 'JUSTIFICADO' || (record.isAbsence && record.isJustified)) {
        setAbsenceMode('JUSTIFIED');
        if (record.justificationReason) {
          if (COMMON_JUSTIFICATION_REASONS.includes(record.justificationReason)) {
            setJustificationReason(record.justificationReason);
          } else {
            setJustificationReason('Otro Motivo Justificado');
            setCustomReason(record.justificationReason);
          }
        }
        setDocumentSupport(record.justificationDocument || '');
        setNotes(record.notes || '');
      } else if (record.status === 'INASISTENCIA' || (record.isAbsence && !record.isJustified)) {
        setAbsenceMode('UNJUSTIFIED');
        setNotes(record.notes || 'Inasistencia no justificada');
      } else if (record.isNeutralCase || (record.netHours === 0 && record.scheduledHours === 0)) {
        // Default to unjustified absence or allow justification
        setAbsenceMode('UNJUSTIFIED');
        setNotes('El colaborador no asistió a su jornada laboral');
      } else {
        setAbsenceMode('ATTENDED');
        setEntryTime(record.earliestTime || OFFICIAL_START_TIME);
        setExitTime(record.latestTime || OFFICIAL_END_TIME);
        setNotes(record.notes || '');
      }
    } else if (initialData) {
      setAbsenceMode('UNJUSTIFIED');
      setNotes('Inasistencia registrada manualmente');
      setDocumentSupport('');
    }
  }, [isOpen, record, initialData]);

  if (!isOpen) return null;

  const currentEmployee = record?.employeeName || initialData?.employeeName || 'Colaborador';
  const currentSite = record?.site || initialData?.site || 'Oficina Opeconca';
  const currentDept = record?.department || initialData?.department || 'General';
  const currentDate = record?.date || initialData?.date || new Date().toISOString().slice(0, 10);

  const handleSave = () => {
    const finalReason =
      justificationReason === 'Otro Motivo Justificado' && customReason.trim()
        ? customReason.trim()
        : justificationReason;

    let updated: AttendanceRecord;

    if (absenceMode === 'UNJUSTIFIED') {
      // Inasistencia Injustificada: 0 net hours, 8h scheduled, -8h variance
      updated = {
        id: record?.id || `absence-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeName: currentEmployee,
        department: currentDept,
        site: currentSite,
        date: currentDate,
        earliestTime: '-',
        latestTime: '-',
        grossHours: 0,
        lunchDeductionHours: 0,
        netHours: 0,
        scheduledHours: SCHEDULED_DAILY_HOURS,
        varianceHours: -SCHEDULED_DAILY_HOURS,
        status: 'INASISTENCIA',
        isNeutralCase: false,
        isAbsence: true,
        isJustified: false,
        sourceFile: record?.sourceFile || 'Registro_Inasistencia_Manual',
        notes: notes.trim() || 'Inasistencia no justificada',
      };
      onSaveAbsence(
        updated,
        `Inasistencia registrada para ${currentEmployee} el ${currentDate} (-8.00h de déficit computado).`
      );
    } else if (absenceMode === 'JUSTIFIED') {
      // Inasistencia Justificada: 0 net hours, 0 scheduled (or exempted), 0 variance
      updated = {
        id: record?.id || `justified-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeName: currentEmployee,
        department: currentDept,
        site: currentSite,
        date: currentDate,
        earliestTime: '-',
        latestTime: '-',
        grossHours: 0,
        lunchDeductionHours: 0,
        netHours: 0,
        scheduledHours: 0,
        varianceHours: 0,
        status: 'JUSTIFICADO',
        isNeutralCase: true,
        isAbsence: true,
        isJustified: true,
        justificationReason: finalReason,
        justificationDocument: documentSupport.trim() || undefined,
        justifiedAt: new Date().toISOString(),
        sourceFile: record?.sourceFile || 'Registro_Inasistencia_Manual',
        notes: notes.trim()
          ? `${finalReason} - ${notes.trim()}`
          : `Inasistencia justificada: ${finalReason}${documentSupport ? ` (Doc: ${documentSupport})` : ''}`,
      };
      onSaveAbsence(
        updated,
        `Inasistencia de ${currentEmployee} justificada como "${finalReason}" el ${currentDate} (sin déficit).`
      );
    } else {
      // Regularizar como Asistencia Laborada (08:00 a 17:30 o personalizada)
      const hoursCalc = calculateAttendanceHours(entryTime, exitTime);
      updated = {
        id: record?.id || `attended-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeName: currentEmployee,
        department: currentDept,
        site: currentSite,
        date: currentDate,
        earliestTime: entryTime,
        latestTime: exitTime,
        grossHours: hoursCalc.grossHours,
        lunchDeductionHours: hoursCalc.lunchDeductionHours,
        netHours: hoursCalc.netHours,
        scheduledHours: hoursCalc.scheduledHours,
        varianceHours: hoursCalc.varianceHours,
        status: hoursCalc.status,
        isNeutralCase: hoursCalc.isNeutralCase,
        isAbsence: false,
        isJustified: false,
        sourceFile: record?.sourceFile || 'Regularizacion_Asistencia_Manual',
        notes: notes.trim() || 'Asistencia regularizada manualmente',
      };
      onSaveAbsence(
        updated,
        `Jornada regularizada para ${currentEmployee}: ${hoursCalc.netHours.toFixed(2)}h netas (${hoursCalc.status}).`
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1F4E79] to-[#2b6ba7] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <UserX className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Gestión de Ausencias e Inasistencias</h2>
              <p className="text-xs text-blue-100">
                Regla institucional: Un día sin asistencia debe justificarse o computarse como inasistencia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee & Date Summary Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#1F4E79]" />
            <span className="font-bold text-slate-800 text-sm">{currentEmployee}</span>
            <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-600 font-medium">
              {currentSite}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">{currentDate}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Option Selector (Tabs) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ¿Cuál es la condición del colaborador en esta jornada?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Inasistencia Injustificada */}
              <button
                type="button"
                onClick={() => setAbsenceMode('UNJUSTIFIED')}
                className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all ${
                  absenceMode === 'UNJUSTIFIED'
                    ? 'border-rose-600 bg-rose-50/80 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    absenceMode === 'UNJUSTIFIED' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Inasistencia</span>
                <span className="text-[10px] text-rose-700 font-semibold mt-0.5">Falta (-8.00h)</span>
              </button>

              {/* Option 2: Inasistencia Justificada */}
              <button
                type="button"
                onClick={() => setAbsenceMode('JUSTIFIED')}
                className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all ${
                  absenceMode === 'JUSTIFIED'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    absenceMode === 'JUSTIFIED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Justificado</span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Permiso (0.00h)</span>
              </button>

              {/* Option 3: Regularizar como Asistió */}
              <button
                type="button"
                onClick={() => setAbsenceMode('ATTENDED')}
                className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all ${
                  absenceMode === 'ATTENDED'
                    ? 'border-[#1F4E79] bg-blue-50/80 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    absenceMode === 'ATTENDED' ? 'bg-[#1F4E79] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">Sí Asistió</span>
                <span className="text-[10px] text-blue-700 font-semibold mt-0.5">Horas Reales</span>
              </button>
            </div>
          </div>

          {/* Contextual Panel for Mode 1: INASISTENCIA INJUSTIFICADA */}
          {absenceMode === 'UNJUSTIFIED' && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    Cómputo como Inasistencia Injustificada
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Al no contar con soporte o causa justificada, el día queda asentado como{' '}
                    <strong>INASISTENCIA</strong>. Se computan 0.00h netas contra las 8.00h
                    programadas, registrando un <strong>déficit de -8.00 horas</strong> que impacta la
                    tasa de cumplimiento del colaborador.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-900 mb-1">
                  Observación institucional de la falta (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Inasistencia sin notificación previa..."
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-rose-300 focus:border-rose-500 outline-none text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Contextual Panel for Mode 2: INASISTENCIA JUSTIFICADA */}
          {absenceMode === 'JUSTIFIED' && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Inasistencia Justificada (Exoneración de Déficit)
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    El colaborador no asistió pero presentó causa legal o institucional válida. Se
                    eximen las horas programadas (0.00h), asegurando que <strong>no se le compute déficit artificial</strong>.
                  </p>
                </div>
              </div>

              {/* Motivo Selector */}
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">
                  Motivo de Justificación Oficial:
                </label>
                <select
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-emerald-300 focus:border-emerald-600 outline-none text-slate-800 font-medium"
                >
                  {COMMON_JUSTIFICATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason input if "Otro" */}
              {justificationReason === 'Otro Motivo Justificado' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Especifique el motivo:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Escriba el motivo de la justificación..."
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-300 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>
              )}

              {/* Document Support */}
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">
                  Documento de Soporte / Número de Comprobante:
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={documentSupport}
                    onChange={(e) => setDocumentSupport(e.target.value)}
                    placeholder="Ej: Reposo Médico IVSS #49281 / Boleta RRHH #04"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-300 focus:border-emerald-500 outline-none text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">
                  Notas de RRHH o Jefatura:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre la autorización, personal que autorizó o condición médica..."
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-300 focus:border-emerald-500 outline-none text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Contextual Panel for Mode 3: SÍ ASISTIÓ (REGULARIZAR) */}
          {absenceMode === 'ATTENDED' && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#1F4E79] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Regularización de Asistencia Efectiva
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Si el colaborador sí asistió pero hubo omisión biométrica o falla de huella, ingrese
                    las horas efectivas de entrada y salida para computar su permanencia con deducción de almuerzo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora de Entrada:
                  </label>
                  <input
                    type="text"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    placeholder="08:00:00"
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-blue-300 focus:border-[#1F4E79] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora de Salida:
                  </label>
                  <input
                    type="text"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    placeholder="17:30:00"
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-blue-300 focus:border-[#1F4E79] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEntryTime('08:00:00');
                    setExitTime('17:30:00');
                  }}
                  className="px-2.5 py-1 rounded bg-blue-100 hover:bg-blue-200 text-[#1F4E79] font-medium text-[11px] transition-colors"
                >
                  Horario Institucional (08:00 - 17:30)
                </button>
              </div>
            </div>
          )}

          {/* Quick Summary Pill */}
          <div className="bg-slate-100 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Resultado proyectado:</span>
            <div className="flex items-center gap-2">
              {absenceMode === 'UNJUSTIFIED' && (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">
                  INASISTENCIA • Déficit: -8.00 h
                </span>
              )}
              {absenceMode === 'JUSTIFIED' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                  JUSTIFICADO • Déficit: 0.00 h
                </span>
              )}
              {absenceMode === 'ATTENDED' && (
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-[#1F4E79] font-bold text-xs">
                  ASISTENCIA REGULARIZADA • 8.00 h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
              absenceMode === 'UNJUSTIFIED'
                ? 'bg-rose-600 hover:bg-rose-700'
                : absenceMode === 'JUSTIFIED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-[#1F4E79] hover:bg-[#163857]'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Guardar y Aplicar Estado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
