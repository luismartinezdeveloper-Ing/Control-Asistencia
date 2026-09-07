import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { AttendanceRecord, EmployeeSummary } from '../types/attendance';
import { formatHours, formatVariance } from '../utils/timeUtils';

interface EmployeeProfileSearchProps {
  employees: EmployeeSummary[];
  records: AttendanceRecord[];
}

export const EmployeeProfileSearch: React.FC<EmployeeProfileSearchProps> = ({
  employees,
  records,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>(
    employees.length > 0 ? employees[0].employeeName : ''
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filtered employees for autocomplete
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(term) ||
        e.site.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  // Currently selected employee summary
  const currentEmployee = useMemo(() => {
    if (!selectedEmployeeName && employees.length > 0) {
      return employees[0];
    }
    return employees.find((e) => e.employeeName === selectedEmployeeName) || employees[0];
  }, [employees, selectedEmployeeName]);

  // Daily records of selected employee
  const employeeDailyRecords = useMemo(() => {
    if (!currentEmployee) return [];
    return records
      .filter((r) => r.employeeName === currentEmployee.employeeName)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, currentEmployee]);

  if (!currentEmployee) {
    return null;
  }

  const isCompliant = currentEmployee.complianceRate >= 100;
  const isPositiveVariance = currentEmployee.varianceHours >= 0;

  return (
    <section
      id="employee-dossier-section"
      className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-full"
    >
      <div>
        {/* Header and Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#1F4E79]" />
              <span>Ficha Individual del Colaborador</span>
            </h2>
            <span className="text-[10px] bg-blue-50 text-[#1F4E79] px-2 py-0.5 rounded font-bold border border-blue-100">
              {currentEmployee.employeeName}
            </span>
          </div>

          {/* Autocomplete / Dropdown Selector */}
          <div className="relative w-full sm:w-64">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="employee-search-input"
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-xs rounded-lg border border-gray-300 focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20 py-1 text-xs">
                  {filteredSuggestions.length === 0 ? (
                    <div className="p-3 text-gray-400 text-center">
                      No se encontraron colaboradores
                    </div>
                  ) : (
                    filteredSuggestions.map((emp) => (
                      <button
                        key={emp.employeeName}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeName(emp.employeeName);
                          setSearchTerm('');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                          emp.employeeName === currentEmployee.employeeName
                            ? 'bg-blue-50 text-[#1F4E79] font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{emp.employeeName}</p>
                          <p className="text-[10px] text-gray-500">
                            {emp.site} • {emp.department}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            emp.complianceRate >= 100
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {emp.complianceRate.toFixed(0)}%
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3 Bento Metric Cards for Selected Employee */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/70">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Sede / Origen</p>
            <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{currentEmployee.site}</p>
            <p className="text-[11px] text-gray-500 truncate">{currentEmployee.department}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/70">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Balance de Horas</p>
            <p
              className={`text-sm font-bold mt-0.5 ${
                isPositiveVariance ? 'text-green-600' : 'text-rose-600'
              }`}
            >
              {formatVariance(currentEmployee.varianceHours)}{' '}
              <span className="text-xs font-normal">
                ({isPositiveVariance ? 'Superávit' : 'Déficit'})
              </span>
            </p>
            <p className="text-[11px] text-gray-500">
              {currentEmployee.totalNetHours.toFixed(1)}h netas / {currentEmployee.totalScheduledHours.toFixed(1)}h prog.
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/70">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Tasa Cumplimiento</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p
                className={`text-sm font-bold ${
                  isCompliant ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {currentEmployee.complianceRate.toFixed(1)}%
              </p>
              {currentEmployee.neutralDays > 0 && (
                <span className="text-[10px] text-amber-700 font-medium">
                  • {currentEmployee.neutralDays} neutral(es)
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompliant ? 'bg-green-600' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, currentEmployee.complianceRate))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Daily History Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[220px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px] sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-3 py-2">Fecha</th>
                  <th scope="col" className="px-3 py-2 text-center">E/S</th>
                  <th scope="col" className="px-3 py-2 text-center">Permanencia</th>
                  <th scope="col" className="px-3 py-2 text-center">Neto</th>
                  <th scope="col" className="px-3 py-2 text-right">Balance</th>
                  <th scope="col" className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {employeeDailyRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 font-mono whitespace-nowrap text-[11px]">
                      {r.earliestTime || '--:--'} - {r.isNeutralCase ? '--:--' : r.latestTime || '--:--'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 font-mono whitespace-nowrap text-[11px]">
                      {r.isNeutralCase ? '--:--' : `${r.grossHours.toFixed(2)}h`}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-900 font-mono whitespace-nowrap">
                      {r.isNeutralCase ? '0.00' : r.netHours.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-[11px]">
                      {r.isNeutralCase ? (
                        <span className="text-gray-400">0.00</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            r.varianceHours >= 0 ? 'text-green-600' : 'text-rose-600'
                          }`}
                        >
                          {formatVariance(r.varianceHours)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {r.status === 'NEUTRAL' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Caso Neutral
                        </span>
                      )}
                      {r.status === 'SUPERAVIT' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Superávit
                        </span>
                      )}
                      {r.status === 'CUMPLIDO' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Completo
                        </span>
                      )}
                      {r.status === 'DEFICIT' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Déficit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
