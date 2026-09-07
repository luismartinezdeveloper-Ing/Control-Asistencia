import React from 'react';
import { X, Clock, Coffee, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  LUNCH_DEDUCTION_HOURS,
  OFFICIAL_END_TIME,
  OFFICIAL_GROSS_HOURS,
  OFFICIAL_START_TIME,
  SCHEDULED_DAILY_HOURS,
} from '../utils/timeUtils';

interface BusinessRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessRulesModal: React.FC<BusinessRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-[#1F4E79] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <ShieldCheck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Reglas de Negocio y Lógica de Horas
              </h3>
              <p className="text-xs text-blue-200">
                Parámetros oficiales aplicados al cálculo de asistencia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm text-slate-700">
          {/* Rule 1: Jornada Programada */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 bg-blue-100 text-[#1F4E79] rounded-lg shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                1. Jornada Programada Diaria: 8.00 Horas Netas
              </h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Cada día laboral exige el cumplimiento de <strong>8.00 horas netas efectivas</strong>. Esta cifra constituye la base de comparación para el cálculo de superávit (+) o déficit (-).
              </p>
            </div>
          </div>

          {/* Rule 2: Horario de Permanencia Oficial */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                2. Permanencia Oficial: 08:00 AM a 05:30 PM (9.5 horas brutas)
              </h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                El intervalo institucional de referencia comprende desde las <strong>08:00:00</strong> hasta las <strong>17:30:00</strong>, totalizando <strong>9.50 horas</strong> de permanencia física en sede.
              </p>
            </div>
          </div>

          {/* Rule 3: Deducción Fija de Almuerzo */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                3. Deducción Fija de Almuerzo: 1.5 Horas (1h 30m)
              </h4>
              <p className="text-slate-700 mt-1 leading-relaxed">
                Se descuenta automáticamente <strong>1.50 horas</strong> de la permanencia bruta diaria:
              </p>
              <div className="mt-2 p-2 bg-white/80 rounded border border-amber-200 font-mono text-xs text-slate-800">
                Horas Netas = max(0, (Hora Salida - Hora Entrada) - 1.50 horas)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ejemplo: Entrada 08:00 y Salida 17:30 = 9.50h brutas - 1.50h almuerzo = <strong>8.00h netas</strong> (100% cumplimiento).
              </p>
            </div>
          </div>

          {/* Rule 4: Casos Neutrales */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
            <div className="p-2 bg-blue-100 text-[#1F4E79] rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[#1F4E79] text-sm">
                4. Casos Neutrales (Marcación Única en el Día)
              </h4>
              <p className="text-slate-700 mt-1 leading-relaxed">
                Si un colaborador solo tiene una única marcación registrada en el día (entrada sin salida o salida sin entrada), el sistema lo clasifica como <strong>'Incompleto / Caso Neutral'</strong>.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No se le restan horas ni se computa déficit artificial en sus métricas acumuladas.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1F4E79] hover:bg-[#163857] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
