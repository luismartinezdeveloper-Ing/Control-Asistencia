import React, { useMemo } from 'react';
import {
  User,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  ShieldCheck,
  Coffee,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { UserAccount } from '../types/auth';
import { formatDateSpanish } from '../utils/timeUtils';

interface EmployeePersonalPortalProps {
  user: UserAccount;
  records: AttendanceRecord[];
  onOpenJustification: (record: AttendanceRecord) => void;
}

export const EmployeePersonalPortal: React.FC<EmployeePersonalPortalProps> = ({
  user,
  records,
  onOpenJustification,
}) => {
  // Filter strictly by the current user's linked name or email identifier
  const userRecords = useMemo(() => {
    const targetName = (user.linkedEmployeeName || user.name).toUpperCase().trim();
    return records.filter((r) => {
      const recName = (r.employeeName || '').toUpperCase().trim();
      return recName.includes(targetName) || targetName.includes(recName);
    });
  }, [records, user]);

  // Summaries
  const stats = useMemo(() => {
    let totalDays = userRecords.length;
    let completedDays = 0;
    let deficitDays = 0;
    let absentDays = 0;
    let justifiedDays = 0;
    let totalNetHours = 0;
    let totalScheduledHours = 0;

    for (const r of userRecords) {
      totalNetHours += r.netHours || 0;
      totalScheduledHours += r.scheduledHours || 0;

      if (r.status === 'INASISTENCIA' || (r.isAbsence && !r.isJustified)) {
        absentDays++;
      } else if (r.status === 'JUSTIFICADO' || (r.isAbsence && r.isJustified)) {
        justifiedDays++;
      } else if (r.status === 'DEFICIT') {
        deficitDays++;
      } else {
        completedDays++;
      }
    }

    const attendanceRate = totalDays > 0 ? Math.round(((completedDays + deficitDays) / totalDays) * 100) : 100;
    const balanceHours = Math.round((totalNetHours - totalScheduledHours) * 10) / 10;

    return {
      totalDays,
      completedDays,
      deficitDays,
      absentDays,
      justifiedDays,
      totalNetHours: Math.round(totalNetHours * 10) / 10,
      totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
      attendanceRate,
      balanceHours,
    };
  }, [userRecords]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-[#1F4E79] to-blue-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold shadow-inner">
            <User className="w-7 h-7 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">{user.name}</h2>
              <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                Portal Privado del Colaborador
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">{user.roleTitle}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-blue-100">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 opacity-80" /> {user.department || 'Operaciones'}
              </span>
              <span>•</span>
              <span>Sede: {user.site || 'Oficina Opeconca'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/15 flex items-center gap-4 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Mi Asistencia</span>
            <span className="text-2xl font-black">{stats.attendanceRate}%</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Saldo de Horas</span>
            <span
              className={`text-lg font-black ${
                stats.balanceHours >= 0 ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {stats.balanceHours >= 0 ? `+${stats.balanceHours}h` : `${stats.balanceHours}h`}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards for the individual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Jornadas Cumplidas</span>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center justify-between">
            <span>{stats.completedDays}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-400">Jornadas completas ≥8h</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Déficit de Horas</span>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center justify-between">
            <span>{stats.deficitDays}</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-[11px] text-slate-400">Salidas anticipadas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Inasistencias</span>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center justify-between">
            <span className={stats.absentDays > 0 ? 'text-rose-600' : 'text-slate-900'}>
              {stats.absentDays}
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-[11px] text-slate-400">Sin justificar</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Horas Netas</span>
          <div className="text-2xl font-black text-[#1F4E79] mt-1 flex items-center justify-between">
            <span>{stats.totalNetHours}h</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-[11px] text-slate-400">Prog: {stats.totalScheduledHours}h</span>
        </div>
      </div>

      {/* Rules Reminder for Employee */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-[#1F4E79] shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">Políticas de Asistencia y Almuerzo:</strong>
          Recuerda que la permanencia efectiva deduce automáticamente <strong>1.5 horas reglamentarias de almuerzo</strong>. En caso de inasistencia médica o causa mayor, puedes presionar el botón <em>"Justificar"</em> para adjuntar el comprobante que será evaluado por el Scrum Master / RRHH.
        </div>
      </div>

      {/* Personal Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1F4E79]" /> Mis Marcaciones e Historial de Asistencia
          </h3>
          <span className="text-xs text-slate-500">
            {userRecords.length} registro(s) disponibles
          </span>
        </div>

        {userRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No se encontraron marcaciones vinculadas a tu cuenta en el período activo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Entrada</th>
                  <th className="p-3">Salida</th>
                  <th className="p-3">Almuerzo</th>
                  <th className="p-3">Horas Netas</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {userRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {formatDateSpanish(r.date, true)}
                    </td>
                    <td className="p-3 font-mono">{r.firstCheckIn || '--:--'}</td>
                    <td className="p-3 font-mono">{r.lastCheckOut || '--:--'}</td>
                    <td className="p-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-slate-400" /> 1.5h
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{r.netHours}h</td>
                    <td className="p-3 font-bold">
                      <span
                        className={
                          r.balanceHours >= 0 ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {r.balanceHours >= 0 ? `+${r.balanceHours}h` : `${r.balanceHours}h`}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.status === 'INASISTENCIA' ? (
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          Inasistencia
                        </span>
                      ) : r.status === 'JUSTIFICADO' ? (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          Justificado
                        </span>
                      ) : r.status === 'DEFICIT' ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          Déficit Horario
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          Cumplido
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'INASISTENCIA' && (
                        <button
                          type="button"
                          onClick={() => onOpenJustification(r)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Upload className="w-3 h-3" /> Justificar
                        </button>
                      )}
                      {r.status === 'JUSTIFICADO' && (
                        <span className="text-[11px] text-blue-700 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> En regla
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
