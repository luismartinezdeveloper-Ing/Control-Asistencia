import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  CalendarRange,
  CalendarDays,
  HardDrive,
  Users,
  ChevronDown,
  Settings2,
  Zap,
  User,
  LogOut,
  Crown,
  Code2,
  Eye,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { GlobalKPIs, LoadedFileMeta } from '../types/attendance';
import { UserAccount, ScrumRole } from '../types/auth';

export type AppTab =
  | 'dashboard'
  | 'scrum_sprint'
  | 'employees_roster'
  | 'daily_uploader'
  | 'daily_report'
  | 'weekly_report'
  | 'monthly_report'
  | 'personal_portal';

interface NavbarProps {
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onExportExcel: () => void;
  onExportNalysExcel?: () => void;
  onOpenNalysModal?: () => void;
  onLoadSampleData: () => void;
  onClearData: () => void;
  onOpenRules: () => void;
  hasData: boolean;
  loadedFiles: LoadedFileMeta[];
  kpis: GlobalKPIs;
  isSavedLocally?: boolean;
}

interface TabItem {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenChangePassword,
  activeTab,
  onSelectTab,
  onExportExcel,
  onExportNalysExcel,
  onOpenNalysModal,
  onLoadSampleData,
  onClearData,
  onOpenRules,
  hasData,
  loadedFiles,
  kpis,
  isSavedLocally = true,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role?: ScrumRole) => {
    switch (role) {
      case 'PRODUCT_OWNER':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'SCRUM_MASTER':
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
      case 'DEVELOPMENT_TEAM':
        return <Code2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'STAKEHOLDER':
        return <Eye className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  const isDevTeam = currentUser?.role === 'DEVELOPMENT_TEAM';
  const isStakeholder = currentUser?.role === 'STAKEHOLDER';
  const canUpload = currentUser?.role === 'SCRUM_MASTER' || currentUser?.role === 'PRODUCT_OWNER';

  // Role-based tabs
  const tabs: TabItem[] = isDevTeam
    ? [
        { id: 'personal_portal', label: 'Mi Portal de Asistencia', icon: User },
      ]
    : [
        { id: 'dashboard', label: 'Tablero General', icon: LayoutDashboard },
        { id: 'scrum_sprint', label: 'Sprint Board (Scrum)', icon: Zap, highlight: true },
        {
          id: 'employees_roster',
          label: 'Padrón de Colaboradores',
          icon: Users,
          badge: kpis.totalEmployees,
        },
        ...(canUpload
          ? [{ id: 'daily_uploader' as AppTab, label: 'Cargar por Día del Mes', icon: CalendarPlus }]
          : []),
        { id: 'daily_report', label: 'Reporte Diario', icon: Calendar },
        { id: 'weekly_report', label: 'Reporte Semanal', icon: CalendarRange },
        { id: 'monthly_report', label: 'Reporte Mensual', icon: CalendarDays },
      ];

  return (
    <header
      id="app-header"
      className="bg-[#1F4E79] text-white shadow-md sticky top-0 z-30 transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3 border-b border-white/10">
          {/* Brand & Title */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-3">
              <div
                id="header-logo"
                className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0"
              >
                <Clock className="w-5 h-5 text-[#1F4E79]" />
              </div>
              <div>
                <h1
                  id="header-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5"
                >
                  Control de Asistencia{' '}
                  <span className="font-light opacity-80 text-blue-100">| AssistPro</span>
                </h1>
                <p className="text-[11px] text-blue-200 hidden sm:block">
                  Consolidación multisede • Deducción fija 1.5h almuerzo • Gobierno Ágil Scrum
                </p>
              </div>
            </div>

            {/* Quick Rules trigger on mobile */}
            <button
              type="button"
              onClick={onOpenRules}
              title="Ver reglas de cálculo"
              className="md:hidden p-2 rounded-lg bg-white/10 text-blue-200 hover:text-white"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons, Persistent Storage & User Profile */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {isSavedLocally && hasData && (
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-blue-100 text-[11px] border border-white/10"
                title="Tus registros están guardados de forma segura en el almacenamiento local"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-300" />
                <span>Guardado local activo</span>
              </div>
            )}

            <button
              id="btn-rules-modal"
              type="button"
              onClick={onOpenRules}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 rounded-md border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline">Reglas</span>
            </button>



            {hasData && canUpload && (
              <button
                id="btn-reset-data"
                type="button"
                onClick={onClearData}
                className="px-2.5 py-1.5 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Limpiar todos los datos cargados y almacenados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}

            {/* Excel Export Split Button for PO, SM & Stakeholder */}
            {!isDevTeam && (
              <div className="relative" ref={exportMenuRef}>
                <div className="inline-flex rounded-lg shadow-sm">
                  <button
                    id="btn-export-excel-header"
                    type="button"
                    onClick={onExportNalysExcel || onExportExcel}
                    disabled={!hasData}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-l-lg flex items-center gap-2 transition-all cursor-pointer ${
                      hasData
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 active:scale-[0.98]'
                        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                    }`}
                    title="Descargar reporte detallado de asistencia en Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>Exportar a Excel</span>
                    <Download className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  <button
                    id="btn-export-options-toggle"
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={!hasData}
                    className={`px-2 py-1.5 rounded-r-lg border-l border-emerald-700/60 transition-all cursor-pointer flex items-center justify-center ${
                      hasData
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                    }`}
                    title="Más formatos de exportación"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Options */}
                {showExportMenu && hasData && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 text-xs animation-fade-in">
                    <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Formatos de Descarga Excel
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        if (onExportNalysExcel) onExportNalysExcel();
                        else onExportExcel();
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-start gap-2.5 cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-200">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-xs">Reporte Detallado de Asistencia</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">Recomendado</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Estructura de 12 columnas: marcaciones completas, deducción 1.5h almuerzo, horas netas y balance.
                        </p>
                      </div>
                    </button>

                    {onOpenNalysModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          onOpenNalysModal();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2.5 cursor-pointer text-slate-700 text-xs font-semibold"
                      >
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-800 text-xs font-medium">Personalizar Columnas y Filtros...</span>
                          <span className="text-[10px] text-slate-400 block font-normal">Auditado vs plano, filtro por sede</span>
                        </div>
                      </button>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        onExportExcel();
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-start gap-2.5 cursor-pointer group mt-1"
                    >
                      <div className="w-7 h-7 rounded-md bg-blue-100 text-[#1F4E79] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-200">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-800 text-xs">Consolidado Multicapa (4 Hojas)</span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Panel de Control, Resumen por Empleado, Registro Diario y Parámetros.
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Current Scrum User Avatar & Dropdown */}
            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-1.5 pr-2.5 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl border border-white/15 flex items-center gap-2 text-left cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-white">
                    {getRoleIcon(currentUser.role)}
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-blue-200 block uppercase font-mono">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-300" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 text-slate-800 text-xs space-y-2.5 animation-fade-in">
                    <div className="border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-[#1F4E79]">
                          {getRoleIcon(currentUser.role)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{currentUser.name}</span>
                          <span className="text-[10px] text-slate-500 block">{currentUser.email}</span>
                        </div>
                      </div>
                      <div className="mt-2 bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 space-y-1">
                        <div>
                          <strong>Rol Scrum:</strong> {currentUser.roleTitle}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Sesión Activa y Protegida
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {onOpenChangePassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenChangePassword();
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1F4E79] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Cambiar Contraseña</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión Privada</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto py-2 gap-1.5 scrollbar-none">
          <nav className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  onClick={() => onSelectTab(tab.id as AppTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#1F4E79] shadow-sm'
                      : tab.highlight
                      ? 'text-amber-200 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-300/30'
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1F4E79]' : tab.highlight ? 'text-amber-300' : 'text-blue-200'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#1F4E79] text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="text-right text-blue-200 text-[11px] whitespace-nowrap hidden md:block font-medium pl-4">
            {loadedFiles.length > 0 ? (
              <span>
                {kpis.totalEmployees} colaboradores • {kpis.totalRecords} registros en memoria
              </span>
            ) : (
              <span>Sin registros</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

