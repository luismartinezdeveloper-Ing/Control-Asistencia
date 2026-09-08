import React, { useState, useMemo, useEffect } from 'react';
import {
  AttendanceRecord,
  EmployeeSummary,
  GlobalKPIs,
  LoadedFileMeta,
  SiteSummary,
  PeriodFilterState,
} from './types/attendance';
import { UserAccount, ScrumSprint } from './types/auth';
import {
  getStoredCurrentUser,
  saveStoredCurrentUser,
  getStoredSprint,
  saveStoredSprint,
  verifyCurrentSession,
} from './utils/authStorage';
import {
  computeEmployeeSummaries,
  computeGlobalKPIs,
  computeSiteSummaries,
  SAMPLE_ATTENDANCE_RECORDS,
} from './utils/sampleData';
import { parseExcelFile } from './utils/excelParser';
import { exportConsolidatedExcel, exportDetailedAttendanceExcel } from './utils/excelExporter';
import {
  loadStoredAttendance,
  loadAndMigrateAttendance,
  saveStoredAttendance,
  saveStoredAttendanceDetailed,
  persistToIndexedDb,
  clearStoredAttendance,
  repairRecordsSite,
} from './utils/storage';
import { Navbar, AppTab } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { ScrumSprintBoard } from './components/ScrumSprintBoard';
import { EmployeePersonalPortal } from './components/EmployeePersonalPortal';
import { Dropzone } from './components/Dropzone';
import { KpiCards } from './components/KpiCards';
import { EmployeeProfileSearch } from './components/EmployeeProfileSearch';
import { SitesSummaryTable } from './components/SitesSummaryTable';
import { DailyRecordsTable } from './components/DailyRecordsTable';
import { BusinessRulesModal } from './components/BusinessRulesModal';
import { DailyDocumentUploader } from './components/DailyDocumentUploader';
import { DailyReportView } from './components/DailyReportView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { ExecutiveAnalytics } from './components/ExecutiveAnalytics';
import { DocumentAuditModal } from './components/DocumentAuditModal';
import { EmployeesRosterView } from './components/EmployeesRosterView';
import { ExecutiveMorningBriefing } from './components/ExecutiveMorningBriefing';
import { ExecutiveSitesCards } from './components/ExecutiveSitesCards';
import { ExecutiveEmployeeFinder } from './components/ExecutiveEmployeeFinder';
import { ExecutiveEmployeeModal } from './components/ExecutiveEmployeeModal';
import { ExecutiveAttendanceTrendChart } from './components/ExecutiveAttendanceTrendChart';
import { ExecutivePunctualityHeatmap } from './components/ExecutivePunctualityHeatmap';
import { AbsenceJustificationModal } from './components/AbsenceJustificationModal';
import { NalysExportModal } from './components/NalysExportModal';
import { GlobalPeriodFilter } from './components/GlobalPeriodFilter';
import { QuickFlowCenter } from './components/QuickFlowCenter';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  FileSpreadsheet,
  CalendarPlus,
  Calendar,
  CalendarRange,
  CalendarDays,
  ShieldCheck,
  Users,
  Briefcase,
  SlidersHorizontal,
  Lock,
  ShieldAlert,
} from 'lucide-react';

/**
 * Role-Based Access Control (RBAC) & Tab Routing Validation
 * - DEVELOPMENT_TEAM: Allowed access ONLY to 'personal_portal'. Dashboard, roster and management tabs are restricted.
 * - PRODUCT_OWNER / SCRUM_MASTER / STAKEHOLDER: Allowed access to 'dashboard', 'scrum_sprint', 'employees_roster', 'daily_report', 'weekly_report', 'monthly_report'.
 * - 'personal_portal' is strictly prohibited for management roles.
 * - 'daily_uploader' is restricted to PRODUCT_OWNER and SCRUM_MASTER.
 */
function isTabAccessibleForRole(tab: AppTab, user: UserAccount | null): boolean {
  if (!user) return false;

  const isDevTeam = user.role === 'DEVELOPMENT_TEAM';

  // Strict Rule 1: 'personal_portal' is ONLY allowed for Development Team members
  if (tab === 'personal_portal') {
    return isDevTeam;
  }

  // Strict Rule 2: Management dashboard, personnel roster and admin views are restricted for Development Team
  if (isDevTeam) {
    return false;
  }

  // Strict Rule 3: Daily document uploader is restricted to Scrum Master and Product Owner
  if (tab === 'daily_uploader') {
    return user.role === 'SCRUM_MASTER' || user.role === 'PRODUCT_OWNER';
  }

  // Other management tabs are accessible for authorized leadership / auditor roles
  return true;
}

function getDefaultTabForRole(user: UserAccount | null): AppTab {
  if (user?.role === 'DEVELOPMENT_TEAM') {
    return 'personal_portal';
  }
  return 'dashboard';
}

export default function App() {
  // Current logged in Scrum user
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return getStoredCurrentUser();
  });

  const [sprint, setSprint] = useState<ScrumSprint>(() => {
    return getStoredSprint();
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const user = getStoredCurrentUser();
    if (user?.role === 'DEVELOPMENT_TEAM') return 'personal_portal';
    return 'dashboard';
  });

  // Hydrate records and files from localStorage if present, otherwise initial demo
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const stored = loadStoredAttendance();
    if (stored && stored.records && stored.records.length > 0) {
      return repairRecordsSite(stored.records);
    }
    return SAMPLE_ATTENDANCE_RECORDS;
  });

  const [loadedFiles, setLoadedFiles] = useState<LoadedFileMeta[]>(() => {
    const stored = loadStoredAttendance();
    if (stored && stored.loadedFiles && stored.loadedFiles.length > 0) {
      return stored.loadedFiles;
    }
    return [
      {
        id: 'demo-opeconca',
        name: 'Biometrico_Opeconca_Septiembre.xlsx',
        size: 45200,
        format: 'OPECONCA',
        recordsCount: 8,
        loadedAt: new Date(),
      },
      {
        id: 'demo-nalys',
        name: 'Reporte_Diario_Nalys.xlsx',
        size: 38400,
        format: 'NALYS',
        recordsCount: 8,
        loadedAt: new Date(),
      },
      {
        id: 'demo-unefa',
        name: 'Reporte_Diario_UNEFA.xlsx',
        size: 41200,
        format: 'UNEFA',
        recordsCount: 7,
        loadedAt: new Date(),
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [auditModalFile, setAuditModalFile] = useState<LoadedFileMeta | null>(null);
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState<string | null>(null);
  const [justificationModalRecord, setJustificationModalRecord] = useState<AttendanceRecord | null>(null);
  const [isJustificationOpen, setIsJustificationOpen] = useState(false);
  const [isNalysModalOpen, setIsNalysModalOpen] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'executive' | 'detailed'>('executive');

  // Unified Global Period Filter state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>({
    mode: 'ALL',
    startDate: '',
    endDate: '',
    anchorDate: '',
  });

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(() => {
    const stored = loadStoredAttendance();
    if (stored && stored.records && stored.records.length > 0) {
      return {
        text: `Se han restaurado ${stored.records.length} registros guardados en tu almacenamiento local.`,
        type: 'success',
      };
    }
    return {
      text: 'Datos iniciales listos. Sistema privado Scrum activo.',
      type: 'info',
    };
  });

  const handleLogin = (user: UserAccount) => {
    saveStoredCurrentUser(user);
    setCurrentUser(user);
    const target = getDefaultTabForRole(user);
    setActiveTab(target);
    setNotification({
      text: `Bienvenido(a), ${user.name}. Acceso verificado como ${user.roleTitle}.`,
      type: 'success',
    });
  };

  const handleLogout = () => {
    saveStoredCurrentUser(null);
    setCurrentUser(null);
    setNotification(null);
  };

  /**
   * Protected tab selection handler validating RBAC permissions before switching
   */
  const handleSelectTab = (targetTab: AppTab) => {
    if (!currentUser) return;

    if (!isTabAccessibleForRole(targetTab, currentUser)) {
      const fallbackTab = getDefaultTabForRole(currentUser);
      setActiveTab(fallbackTab);

      let errorMsg = 'Acceso no autorizado para tu rol de usuario.';
      if (currentUser.role === 'DEVELOPMENT_TEAM') {
        errorMsg =
          'Acceso restringido: Los colaboradores del Equipo de Desarrollo tienen acceso exclusivo a su Portal Personal.';
      } else if (targetTab === 'personal_portal') {
        errorMsg =
          'El Portal Personal está reservado exclusivamente para los colaboradores del Equipo de Desarrollo.';
      } else if (targetTab === 'daily_uploader') {
        errorMsg =
          'Permiso denegado: La carga de biométricos diarios está reservada para Scrum Master y Product Owner.';
      }

      setNotification({
        text: errorMsg,
        type: 'error',
      });
      return;
    }

    setActiveTab(targetTab);
  };

  // Automatically verify JWT session and hydrate/migrate storage from IndexedDB on startup
  useEffect(() => {
    async function initApp() {
      if (currentUser) {
        const session = await verifyCurrentSession();
        if (!session.valid) {
          setCurrentUser(null);
          setNotification({
            text: session.error || 'Tu sesión ha expirado o es inválida. Por favor inicia sesión nuevamente.',
            type: 'error',
          });
        }
      }

      // Check for persisted data in IndexedDB
      try {
        const migrated = await loadAndMigrateAttendance();
        if (migrated && migrated.records && migrated.records.length > 0) {
          setRecords(migrated.records);
          if (migrated.loadedFiles && migrated.loadedFiles.length > 0) {
            setLoadedFiles(migrated.loadedFiles);
          }
        }
      } catch (err) {
        console.warn('Initial storage hydration notice:', err);
      }
    }
    initApp();
  }, []);

  // RBAC route protection: sync and correct activeTab whenever user or tab state change
  useEffect(() => {
    if (currentUser && !isTabAccessibleForRole(activeTab, currentUser)) {
      setActiveTab(getDefaultTabForRole(currentUser));
    }
  }, [currentUser, activeTab]);

  // Automatically persist records to storage whenever records or loadedFiles change with quota alert and IndexedDB sync
  useEffect(() => {
    const saveResult = saveStoredAttendanceDetailed(records, loadedFiles);
    if (!saveResult.success && saveResult.error === 'QUOTA_EXCEEDED') {
      setNotification({
        text: '¡Advertencia de Almacenamiento! Límite de cuota del navegador alcanzado. Exporta tus datos para no perder registros.',
        type: 'error',
      });
    }
    // High-capacity transactional background backup
    persistToIndexedDb(records, loadedFiles).catch((err) => {
      console.warn('IndexedDB persistence warning:', err);
    });
  }, [records, loadedFiles]);

  // Auto-dismiss notification after 7 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Derived filtered records according to global period filter
  const filteredRecords: AttendanceRecord[] = useMemo(() => {
    if (periodFilter.mode === 'ALL') {
      return records;
    }
    if (!periodFilter.startDate || !periodFilter.endDate) {
      return records;
    }
    return records.filter((r) => {
      if (!r.date) return false;
      return r.date >= periodFilter.startDate && r.date <= periodFilter.endDate;
    });
  }, [records, periodFilter]);

  // Derived summaries computed synchronously on filteredRecords
  const employeeSummaries: EmployeeSummary[] = useMemo(() => {
    return computeEmployeeSummaries(filteredRecords);
  }, [filteredRecords]);

  const siteSummaries: SiteSummary[] = useMemo(() => {
    return computeSiteSummaries(filteredRecords);
  }, [filteredRecords]);

  const globalKpis: GlobalKPIs = useMemo(() => {
    return computeGlobalKPIs(filteredRecords, employeeSummaries);
  }, [filteredRecords, employeeSummaries]);

  // Handle general file uploads (from dashboard dropzone)
  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    setNotification(null);

    const newRecords: AttendanceRecord[] = [];
    const newLoadedMeta: LoadedFileMeta[] = [];
    const formatSummaries: string[] = [];
    const anomalousFiles: string[] = [];

    try {
      for (const file of files) {
        try {
          const result = await parseExcelFile(file);
          newRecords.push(...result.records);
          newLoadedMeta.push({
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            size: file.size,
            format: result.format,
            recordsCount: result.records.length,
            loadedAt: new Date(),
            rawRowsCount: result.audit?.totalRawRows,
            headerRowIndex: result.audit?.headerRowIndex,
            uniqueEmployeesCount: result.audit?.uniqueEmployeesCount,
            neutralCasesCount: result.audit?.neutralCasesCount,
            skippedRowsCount: result.audit?.skippedEmptyRows,
            sheetName: result.audit?.sheetName,
            sheetNames: result.audit?.sheetNames,
            detectedColumns: result.audit?.detectedColumns,
            employeeNames: result.audit?.employeeList,
          });
          formatSummaries.push(
            `"${file.name}": ${result.audit?.uniqueEmployeesCount || 0} personas identificadas en ${result.audit?.sheetNames?.length || 1} hoja(s) (${result.records.length} jornadas)`
          );
        } catch (parseErr: unknown) {
          // File has zero records or missing headers!
          // Register it as an anomalous file so the Data Quality Banner can offer Quick Fix
          const errMsg = parseErr instanceof Error ? parseErr.message : 'Error de lectura';
          newLoadedMeta.push({
            id: `anomalous-${file.name}-${Date.now()}`,
            name: file.name,
            size: file.size,
            format: 'UNKNOWN',
            recordsCount: 0,
            loadedAt: new Date(),
            headerRowIndex: -1,
            detectedColumns: [],
            rawRowsCount: 0,
            skippedRowsCount: 0,
          });
          anomalousFiles.push(`"${file.name}" (0 registros / encabezados faltantes)`);
        }
      }

      // If previous records were only demo data, replace them, otherwise append
      const isDemoOnly = loadedFiles.some((f) => f.id.startsWith('demo-'));
      if (isDemoOnly) {
        setRecords(newRecords);
        setLoadedFiles(newLoadedMeta);
      } else {
        setRecords((prev) => [...prev, ...newRecords]);
        setLoadedFiles((prev) => [...prev, ...newLoadedMeta]);
      }

      if (anomalousFiles.length > 0) {
        setNotification({
          text: `Atención: ${anomalousFiles.join(' | ')}. No se pudieron extraer registros válidos o encabezados requeridos.`,
          type: 'error',
        });
      } else {
        setNotification({
          text: `Procesamiento completado y guardado: ${formatSummaries.join(' | ')}.`,
          type: 'success',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al leer el archivo Excel.';
      setNotification({
        text: `Error al procesar archivo: ${msg}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add records for a specific day from DailyDocumentUploader
  const handleAddRecordsForDay = (
    newRecords: AttendanceRecord[],
    fileMeta: LoadedFileMeta,
    mode: 'append' | 'replace',
    dayStr: string
  ) => {
    // If existing records were only demo data, replace them entirely with user data
    const isDemoOnly = loadedFiles.some((f) => f.id.startsWith('demo-'));

    setRecords((prev) => {
      let base = isDemoOnly ? [] : prev;
      if (mode === 'replace') {
        base = base.filter((r) => r.date !== dayStr);
      }
      return [...base, ...newRecords];
    });

    setLoadedFiles((prev) => {
      let base = isDemoOnly ? [] : prev;
      if (mode === 'replace') {
        base = base.filter((f) => !f.id.includes(dayStr));
      }
      return [...base, fileMeta];
    });

    setNotification({
      text: `Documento cargado con éxito para el día ${dayStr} (${newRecords.length} registros). Guardado permanentemente.`,
      type: 'success',
    });
  };

  // Remove records for a specific day
  const handleRemoveRecordsForDay = (dayStr: string) => {
    setRecords((prev) => prev.filter((r) => r.date !== dayStr));
    setLoadedFiles((prev) => prev.filter((f) => !f.id.includes(dayStr)));
    setNotification({
      text: `Se han eliminado los registros del día ${dayStr}. Cambios guardados.`,
      type: 'info',
    });
  };

  // Export Consolidated Excel (all 4 sheets) for the active filtered period
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;
    try {
      exportConsolidatedExcel(filteredRecords, employeeSummaries, siteSummaries, globalKpis);
      const periodSuffix =
        periodFilter.mode === 'ALL'
          ? 'histórico completo'
          : `${periodFilter.startDate} al ${periodFilter.endDate}`;
      setNotification({
        text: `Reporte consolidado descargado exitosamente (${periodSuffix}, ${filteredRecords.length} jornadas).`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar';
      setNotification({
        text: `Error al generar el archivo Excel: ${msg}`,
        type: 'error',
      });
    }
  };

  // Export in detailed Attendance Report format (12 columns + summary)
  const handleExportNalysExcel = () => {
    if (filteredRecords.length === 0) return;
    try {
      const periodSuffix =
        periodFilter.mode === 'ALL'
          ? 'Historico_Completo'
          : `${periodFilter.startDate}_al_${periodFilter.endDate}`;
      exportDetailedAttendanceExcel(filteredRecords, {
        customFileName: `Reporte_Asistencia_${periodSuffix}.xlsx`,
        dateLabel: periodSuffix,
        sheetName: 'Reporte_Asistencia',
      });
      setNotification({
        text: `Reporte de Asistencia en Excel exportado exitosamente (${filteredRecords.length} registros).`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar reporte de asistencia';
      setNotification({
        text: `Error al exportar reporte: ${msg}`,
        type: 'error',
      });
    }
  };

  // Load sample demo data
  const handleLoadDemoData = () => {
    setRecords(SAMPLE_ATTENDANCE_RECORDS);
    setLoadedFiles([
      {
        id: 'demo-opeconca',
        name: 'Biometrico_Opeconca_Septiembre.xlsx',
        size: 58200,
        format: 'OPECONCA',
        recordsCount: 13,
        loadedAt: new Date(),
      },
      {
        id: 'demo-nalys',
        name: 'Reporte_Diario_Nalys.xlsx',
        size: 52400,
        format: 'NALYS',
        recordsCount: 13,
        loadedAt: new Date(),
      },
      {
        id: 'demo-unefa',
        name: 'Reporte_Diario_UNEFA.xlsx',
        size: 54200,
        format: 'UNEFA',
        recordsCount: 12,
        loadedAt: new Date(),
      },
    ]);
    setNotification({
      text: 'Se han restaurado los datos con el padrón ampliado de las 3 sedes (Opeconca, Nalys y UNEFA).',
      type: 'info',
    });
  };

  // Clear data
  const handleClearData = () => {
    setRecords([]);
    setLoadedFiles([]);
    clearStoredAttendance();
    setNotification({
      text: 'Se han limpiado todos los registros y la memoria local. Ahora puedes cargar tus archivos reales.',
      type: 'info',
    });
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar with Navy Brand #1F4E79, Scrum User Profile and View Tabs */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onExportExcel={handleExportExcel}
        onExportNalysExcel={handleExportNalysExcel}
        onOpenNalysModal={() => setIsNalysModalOpen(true)}
        onLoadSampleData={handleLoadDemoData}
        onClearData={handleClearData}
        onOpenRules={() => setIsRulesModalOpen(true)}
        hasData={records.length > 0}
        loadedFiles={loadedFiles}
        kpis={globalKpis}
        isSavedLocally={true}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Floating Notification */}
        {notification && (
          <div
            id="app-notification-banner"
            className={`mb-4 p-3 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm shadow-xs transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notification.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {notification.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              {notification.type === 'info' && (
                <Info className="w-4 h-4 text-[#1F4E79] shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Access Denied Guard Alert (if unauthorized tab is requested) */}
        {!isTabAccessibleForRole(activeTab, currentUser) && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Acceso Restringido por Rol
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-5 leading-relaxed">
              Tu rol actual (<strong className="text-slate-800">{currentUser.roleTitle}</strong>) no tiene autorización para acceder al módulo <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">{activeTab}</code>.
            </p>
            <button
              type="button"
              onClick={() => handleSelectTab(getDefaultTabForRole(currentUser))}
              className="px-4 py-2 bg-[#1F4E79] hover:bg-[#163857] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              Ir a mi panel autorizado
            </button>
          </div>
        )}

        {/* Global Unified Period Filter Bar (only for management views) */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          records.length > 0 &&
          activeTab !== 'daily_uploader' &&
          activeTab !== 'personal_portal' && (
            <div className="mb-5">
              <GlobalPeriodFilter
                records={records}
                periodState={periodFilter}
                onPeriodChange={setPeriodFilter}
                filteredCount={filteredRecords.length}
              />
            </div>
          )}

        {/* Development Team Member Portal (Strictly for DEVELOPMENT_TEAM) */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'personal_portal' &&
          currentUser.role === 'DEVELOPMENT_TEAM' && (
            <EmployeePersonalPortal
              user={currentUser}
              records={records}
              onOpenJustification={(rec) => {
                setJustificationModalRecord(rec);
                setIsJustificationOpen(true);
              }}
            />
          )}

        {/* Scrum Sprint Board */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'scrum_sprint' && (
            <ScrumSprintBoard
              currentUser={currentUser}
              sprint={sprint}
              records={filteredRecords}
              onOpenJustification={(rec) => {
                setJustificationModalRecord(rec);
                setIsJustificationOpen(true);
              }}
              onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
            />
          )}

        {/* View Switcher Content: Personnel Roster */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'employees_roster' && (
            <EmployeesRosterView
              employeeSummaries={employeeSummaries}
              records={records}
              loadedFiles={loadedFiles}
              onSelectEmployee={(_name) => {
                handleSelectTab('dashboard');
              }}
            />
          )}

        {/* Daily Document Uploader (Scrum Master / Product Owner) */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'daily_uploader' && (
            <DailyDocumentUploader
              records={records}
              onAddRecordsForDay={handleAddRecordsForDay}
              onRemoveRecordsForDay={handleRemoveRecordsForDay}
            />
          )}

        {/* Daily Attendance Report */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'daily_report' && (
            <DailyReportView
              records={records}
              onUpdateRecords={(newRecs, msg) => {
                setRecords(newRecs);
                if (msg) {
                  setNotification({ text: msg, type: 'success' });
                }
              }}
            />
          )}

        {/* Weekly Attendance Report */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'weekly_report' && (
            <WeeklyReportView records={records} />
          )}

        {/* Monthly Attendance Report */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'monthly_report' && (
            <MonthlyReportView records={records} />
          )}

        {/* General Management Dashboard */}
        {isTabAccessibleForRole(activeTab, currentUser) &&
          activeTab === 'dashboard' && (
            <div>
              {/* Centro de Control RRHH en 3 Pasos (Carga -> Semáforo -> Versión Final) */}
              <QuickFlowCenter
                records={records}
                loadedFiles={loadedFiles}
                kpis={globalKpis}
                onFilesSelected={handleFilesSelected}
                isLoading={isLoading}
                onExportFinalExcel={handleExportExcel}
                onGoToDetail={() => setActiveTab('daily_report')}
                onLoadDemoData={handleLoadDemoData}
              />

              {records.length > 0 ? (
              <div className="space-y-5">
                {/* Executive vs Analytical Switcher Bar */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#1F4E79] shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                          {dashboardMode === 'executive'
                            ? 'Modo Gerencial • Vista para Dirección'
                            : 'Modo Analítico • Auditoría y RRHH'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dashboardMode === 'executive'
                              ? 'bg-blue-100 text-[#1F4E79]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {dashboardMode === 'executive' ? 'Simplificado' : 'Detallado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dashboardMode === 'executive'
                          ? 'Resumen en 15 segundos, semáforos de salud operativa y alertas inmediatas para toma de decisiones sin tecnicismos.'
                          : 'Tablas completas de marcaciones biométricas, deducción de almuerzo 1.5h y horas al detalle.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setDashboardMode('executive')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dashboardMode === 'executive'
                          ? 'bg-white text-[#1F4E79] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Vista Dueño (Ejecutiva)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardMode('detailed')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dashboardMode === 'detailed'
                          ? 'bg-white text-[#1F4E79] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Vista RRHH (Detallada)</span>
                    </button>
                  </div>
                </div>

                {/* Content according to selected mode */}
                {dashboardMode === 'executive' ? (
                  <div className="space-y-5">
                    {/* Morning Briefing: Resumen Narrativo en 15s + Semáforos + Alertas Críticas */}
                    <ExecutiveMorningBriefing
                      records={filteredRecords}
                      kpis={globalKpis}
                      siteSummaries={siteSummaries}
                      employeeSummaries={employeeSummaries}
                      onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
                      onOpenJustification={(rec) => {
                        setJustificationModalRecord(rec);
                        setIsJustificationOpen(true);
                      }}
                      onGoToDailyReport={() => setActiveTab('daily_report')}
                    />

                    {/* Gráfico de Tendencia Diaria y Patrones de Ausentismo (Recharts) */}
                    <ExecutiveAttendanceTrendChart
                      records={filteredRecords}
                      onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
                      onOpenJustification={(rec) => {
                        setJustificationModalRecord(rec);
                        setIsJustificationOpen(true);
                      }}
                    />

                    {/* Mapa de Calor (Heatmap) de Puntualidad y Patrones Sistemáticos Lunes/Viernes */}
                    <ExecutivePunctualityHeatmap
                      records={filteredRecords}
                      onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
                      onOpenJustification={(rec) => {
                        setJustificationModalRecord(rec);
                        setIsJustificationOpen(true);
                      }}
                    />

                    {/* Quick Access to Key Reports */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('daily_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Diario
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Ver o justificar día específico
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('weekly_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 group-hover:scale-105 transition-transform">
                          <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Semanal
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Matriz de horas y nómina
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('monthly_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-800 group-hover:scale-105 transition-transform">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Mensual
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Consolidado auditado del mes
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('employees_roster')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-blue-100 text-[#1F4E79] group-hover:scale-105 transition-transform">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Padrón ({globalKpis.totalEmployees} personas)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Directorio completo
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Sede Cards as Business Branches */}
                    <ExecutiveSitesCards
                      siteSummaries={siteSummaries}
                      records={filteredRecords}
                      onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
                    />

                    {/* Quick Finder & Clean Roster */}
                    <ExecutiveEmployeeFinder
                      employees={employeeSummaries}
                      records={filteredRecords}
                      onOpenEmployeeModal={(name) => setSelectedEmployeeModal(name)}
                      onOpenJustification={(rec) => {
                        setJustificationModalRecord(rec);
                        setIsJustificationOpen(true);
                      }}
                    />

                    {/* Clean Executive Excel Export */}
                    <div className="bg-[#1F4E79] rounded-xl p-5 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-900/40">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider">
                          Exportación Ejecutiva y Nómina
                        </h3>
                        <p className="text-xs text-blue-200 mt-0.5">
                          Descarga el informe oficial en Excel listo para entregar a gerencia o administración.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Descargar Libro Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo Detallado / RRHH */
                  <div className="space-y-5">
                    {/* Bento Row 1: KPI Cards */}
                    <KpiCards kpis={globalKpis} />

                    {/* Executive Analytics Center: Visual Charts & Verification Callout */}
                    <ExecutiveAnalytics
                      siteSummaries={siteSummaries}
                      records={filteredRecords}
                      loadedFiles={loadedFiles}
                      onOpenAuditModal={(f) => setAuditModalFile(f)}
                    />

                    {/* Bento Quick Nav Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('employees_roster')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-blue-100 text-[#1F4E79] group-hover:scale-105 transition-transform">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Padrón Nominal ({globalKpis.totalEmployees})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Ver todas las personas cargadas
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('daily_uploader')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 group-hover:scale-105 transition-transform">
                          <CalendarPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Carga por Día del Mes
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Subir archivo específico por día
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('daily_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Diario
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Ver y descargar día específico
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('weekly_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 group-hover:scale-105 transition-transform">
                          <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Semanal
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Matriz de horas de la semana
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('monthly_report')}
                        className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#1F4E79] rounded-xl text-left shadow-xs transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-800 group-hover:scale-105 transition-transform">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Reporte Mensual
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Consolidado mensual auditado
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Bento Row 2: Carga de Asistencia & Ficha Individual */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      <div className="lg:col-span-4 flex flex-col">
                        <Dropzone
                          onFilesSelected={handleFilesSelected}
                          isLoading={isLoading}
                          loadedFiles={loadedFiles}
                          onLoadDemoData={handleLoadDemoData}
                          hasData={records.length > 0}
                        />
                      </div>
                      <div className="lg:col-span-8 flex flex-col">
                        <EmployeeProfileSearch
                          employees={employeeSummaries}
                          records={filteredRecords}
                        />
                      </div>
                    </div>

                    {/* Bento Row 3: Resumen Consolidado por Sede */}
                    <SitesSummaryTable siteSummaries={siteSummaries} />

                    {/* Bento Row 4: Registro Diario Consolidado */}
                    <DailyRecordsTable
                      records={filteredRecords}
                      onUpdateRecord={(updatedRec, msg) => {
                        setRecords((prev) =>
                          prev.map((r) => (r.id === updatedRec.id ? updatedRec : r))
                        );
                        if (msg) {
                          setNotification({ text: msg, type: 'success' });
                        }
                      }}
                    />

                    {/* Bottom Export Callout */}
                    <div className="bg-[#1F4E79] rounded-xl p-5 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-900/40">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider">
                          Exportación de Auditoría y Reportes
                        </h3>
                        <p className="text-xs text-blue-200 mt-0.5">
                          Genera el libro Excel con 4 hojas formateadas: Indicadores Generales, Fichas por Colaborador, Resumen de Sedes y Registro Diario.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Descargar Libro Excel Consolidado (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#1F4E79] flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">
                    Aún no has cargado asistencias para analizar
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
                    Utiliza el cuadro superior (Paso 1) para soltar tus archivos Excel reales o pulsa abajo para probar con datos demo.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleLoadDemoData}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F4E79] hover:bg-[#163857] text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Cargar Datos de Demostración</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('daily_uploader')}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition-colors cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4 text-[#1F4E79]" />
                      <span>Carga Avanzada por Día del Mes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sistema de Control de Asistencia Corporativo • Deducción automática de 1.5h almuerzo
          </span>
          <span className="text-slate-400">
            Jornada base: 8.00 h netas • Horario institucional: 08:00 AM - 05:30 PM
          </span>
        </div>
      </footer>

      {/* Business Rules Explanation Modal */}
      <BusinessRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Document Integrity & Verification Audit Modal */}
      <DocumentAuditModal
        isOpen={!!auditModalFile}
        onClose={() => setAuditModalFile(null)}
        fileMeta={auditModalFile}
        records={records}
      />

      {/* Executive Quick Employee Profile Modal */}
      <ExecutiveEmployeeModal
        isOpen={selectedEmployeeModal !== null}
        onClose={() => setSelectedEmployeeModal(null)}
        employeeName={selectedEmployeeModal}
        employees={employeeSummaries}
        records={filteredRecords}
        onOpenJustification={(rec) => {
          setJustificationModalRecord(rec);
          setIsJustificationOpen(true);
        }}
      />

      {/* Absence Justification Modal (Accessible directly from Executive View) */}
      <AbsenceJustificationModal
        isOpen={isJustificationOpen}
        onClose={() => {
          setIsJustificationOpen(false);
          setJustificationModalRecord(null);
        }}
        record={justificationModalRecord}
        onSaveAbsence={(updatedRec, msg) => {
          setRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)));
          setIsJustificationOpen(false);
          setJustificationModalRecord(null);
          if (msg) {
            setNotification({ text: msg, type: 'success' });
          }
        }}
      />

      {/* Advanced Nalys Export Configuration Modal */}
      <NalysExportModal
        isOpen={isNalysModalOpen}
        onClose={() => setIsNalysModalOpen(false)}
        records={filteredRecords}
        currentPeriodLabel={
          periodFilter.mode === 'ALL'
            ? 'Historico_Completo'
            : `${periodFilter.startDate}_al_${periodFilter.endDate}`
        }
      />
    </div>
  );
}
