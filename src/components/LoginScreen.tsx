import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Crown,
  Zap,
  Code2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  KeyRound,
  AlertCircle,
  FileKey,
  Shield,
  Building2,
  Briefcase,
  UserPlus,
  LogIn,
  Fingerprint,
  Info,
} from 'lucide-react';
import { UserAccount, ScrumRole } from '../types/auth';
import {
  DEMO_PASSWORD_STANDARD,
  DEMO_ACCOUNTS,
  loginUser,
  registerUser,
  saveStoredCurrentUser,
} from '../utils/authStorage';
import { validatePasswordPolicy } from '../utils/passwordValidator';

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void;
}

type AuthMode = 'login' | 'register';

const SITE_OPTIONS = [
  'Oficina Opeconca',
  'Nalys',
  'UNEFA',
  'Planta Principal',
  'Operaciones Campo',
];

const DEPARTMENT_OPTIONS = [
  'Operaciones y Logística',
  'Recursos Humanos y Auditoría',
  'Mantenimiento & Producción',
  'Tecnología y Sistemas (TI)',
  'Dirección General',
  'Finanzas y Administración',
  'Seguridad Industrial',
];

// Security authorization code required to register as Product Owner or Scrum Master
const ADMIN_AUTHORIZATION_CODE = 'ADMIN2026';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<ScrumRole>('DEVELOPMENT_TEAM');
  const [regSite, setRegSite] = useState(SITE_OPTIONS[0]);
  const [regDepartment, setRegDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [regBiometricName, setRegBiometricName] = useState('');
  const [regAuthCode, setRegAuthCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Evaluate password policy for registration
  const passwordEvaluation = useMemo(() => {
    return validatePasswordPolicy(regPassword);
  }, [regPassword]);

  // Passwords match check
  const passwordsMatch = useMemo(() => {
    if (!regConfirmPassword) return true;
    return regPassword === regConfirmPassword;
  }, [regPassword, regConfirmPassword]);

  // Handle Login submission — calls backend /auth/login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail) {
      setErrorMsg('Por favor ingresa tu correo electrónico corporativo.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Por favor ingresa tu contraseña de acceso.');
      return;
    }

    setIsProcessing(true);

    try {
      const authResult = await loginUser(cleanEmail, loginPassword);

      if (!authResult.success || !authResult.user) {
        setErrorMsg(authResult.error || 'Credenciales no válidas o usuario no registrado.');
        setIsProcessing(false);
        return;
      }

      // Save sanitized user to localStorage for UI state
      saveStoredCurrentUser(authResult.user);

      onLogin(authResult.user);
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al validar la sesión. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Registration submission — calls backend /auth/register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Ingresa tu nombre y apellido completos.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Ingresa un correo electrónico corporativo válido.');
      return;
    }

    // Role authorization check for elevated permissions (PO / SM) — client-side pre-check
    if (regRole === 'PRODUCT_OWNER' || regRole === 'SCRUM_MASTER') {
      if (regAuthCode.trim() !== ADMIN_AUTHORIZATION_CODE) {
        setErrorMsg(
          `Para registrar un rol administrativo (${regRole.replace('_', ' ')}), debes ingresar un Código de Autorización Corporativo válido emitido por la Dirección General.`
        );
        return;
      }
    }

    // Password policy check
    if (!passwordEvaluation.isValid) {
      setErrorMsg('La contraseña no cumple con los requisitos de seguridad corporativa.');
      setShowCriteria(true);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsProcessing(true);

    try {
      // Role title map
      let roleTitle = 'Dev Team Member / Colaborador';
      if (regRole === 'PRODUCT_OWNER') roleTitle = 'Product Owner / Gerente General';
      else if (regRole === 'SCRUM_MASTER') roleTitle = 'Scrum Master / Jefe de Área';
      else if (regRole === 'STAKEHOLDER') roleTitle = 'Stakeholder / Auditor';

      const biometricName =
        regBiometricName.trim() || cleanName.toUpperCase().replace(/\s+/g, ' ');

      const regResult = await registerUser({
        name: cleanName,
        email: cleanEmail,
        password: regPassword,
        role: regRole,
        roleTitle,
        department: regDepartment,
        site: regSite,
        linkedEmployeeName: biometricName,
        authCode: regAuthCode.trim() || undefined,
      });

      if (!regResult.success || !regResult.user) {
        setErrorMsg(regResult.error || 'Error al registrar la cuenta de usuario.');
        setIsProcessing(false);
        return;
      }

      // Save sanitized user to localStorage
      saveStoredCurrentUser(regResult.user);

      setSuccessMsg('¡Cuenta creada exitosamente! Iniciando sesión...');

      setTimeout(() => {
        onLogin(regResult.user!);
      }, 700);
    } catch (err) {
      setErrorMsg('Error al registrar la cuenta de usuario.');
      setIsProcessing(false);
    }
  };

  const getRoleIcon = (role: ScrumRole) => {
    switch (role) {
      case 'PRODUCT_OWNER':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'SCRUM_MASTER':
        return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'DEVELOPMENT_TEAM':
        return <Code2 className="w-4 h-4 text-blue-500" />;
      case 'STAKEHOLDER':
        return <Eye className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-[#1F4E79] to-blue-700 rounded-2xl shadow-xl shadow-blue-950/50 mb-3 border border-blue-400/30"
        >
          <ShieldCheck className="w-9 h-9 text-white" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Portal de Control de Asistencia
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Acceso protegido al sistema corporativo de gestión y control de asistencia.
        </p>
      </motion.div>

      {/* Main Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10"
      >
        <div className="bg-slate-900/90 backdrop-blur-md py-7 px-6 shadow-2xl rounded-2xl sm:px-9 border border-slate-800 space-y-5">
          {/* Top Auth Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse / Nueva Cuenta</span>
            </button>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: INICIAR SESIÓN */}
          {authMode === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Correo Electrónico Corporativo
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ej. carlos.mendoza@empresa.com"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Contraseña
                  </label>
                </div>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isProcessing}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileKey className="w-4 h-4 text-blue-200" />
                <span>{isProcessing ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              </motion.button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-400">
                  ¿No tienes una cuenta corporativa?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMsg(null);
                    }}
                    className="text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </span>
              </div>

              {/* Botones de Acceso Rápido Demo */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Acceso Rápido Demo (1 Clic)
                  </span>
                  <span className="text-[10px] text-slate-500">Clave: {DEMO_PASSWORD_STANDARD}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(acc.email);
                        setLoginPassword(DEMO_PASSWORD_STANDARD);
                        setErrorMsg(null);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 truncate">
                          {acc.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-medium">
                          {acc.role === 'PRODUCT_OWNER'
                            ? 'PO'
                            : acc.role === 'SCRUM_MASTER'
                            ? 'Scrum Master'
                            : acc.role === 'DEVELOPMENT_TEAM'
                            ? 'Dev Team'
                            : 'Stakeholder'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 truncate mt-0.5">{acc.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTRARSE / CREAR CUENTA */}
          {authMode === 'register' && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Nombre y Apellido
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        if (!regBiometricName) {
                          setRegBiometricName(e.target.value.toUpperCase());
                        }
                      }}
                      placeholder="ej. Carlos Mendoza"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Correo Corporativo
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="carlos.mendoza@empresa.com"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Role and Sede */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-role"
                    className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1"
                  >
                    <span>Rol de Acceso (Scrum)</span>
                  </label>
                  <select
                    id="reg-role"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as ScrumRole)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="DEVELOPMENT_TEAM">Development Team (Colaborador)</option>
                    <option value="STAKEHOLDER">Stakeholder (Auditor / Consulta)</option>
                    <option value="SCRUM_MASTER">Scrum Master (Jefe de Área / RRHH)</option>
                    <option value="PRODUCT_OWNER">Product Owner (Gerencia General)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-site"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Sede Operativa Asignada
                  </label>
                  <select
                    id="reg-site"
                    value={regSite}
                    onChange={(e) => setRegSite(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {SITE_OPTIONS.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Department and Biometric Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-dept"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Departamento
                  </label>
                  <select
                    id="reg-dept"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-bio-name"
                    className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between"
                  >
                    <span>Nombre en Biométrico</span>
                    <span className="text-[10px] text-slate-400">(Para vinculación)</span>
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-bio-name"
                      type="text"
                      value={regBiometricName}
                      onChange={(e) => setRegBiometricName(e.target.value.toUpperCase())}
                      placeholder="ej. CARLOS MENDOZA"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Conditional Admin Authorization Code for elevated roles */}
              {(regRole === 'PRODUCT_OWNER' || regRole === 'SCRUM_MASTER') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="reg-auth-code"
                      className="text-xs font-bold text-amber-300 flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Código de Autorización Corporativa (Requerido para {regRole.replace('_', ' ')})
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">Clave Segura</span>
                  </div>
                  <input
                    id="reg-auth-code"
                    type="password"
                    required
                    value={regAuthCode}
                    onChange={(e) => setRegAuthCode(e.target.value)}
                    placeholder="Ingresa el código de autorización"
                    className="block w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-lg text-amber-200 placeholder-amber-700/60 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10.5px] text-amber-200/80">
                    Por políticas de seguridad corporativa, los roles con permisos de gerencia requieren una clave de activación previa.
                  </p>
                </motion.div>
              )}

              {/* Row 4: Password and Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-pass"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Contraseña
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <input
                      id="reg-pass"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (!showCriteria && e.target.value.length > 0) {
                          setShowCriteria(true);
                        }
                      }}
                      onFocus={() => setShowCriteria(true)}
                      placeholder="Mínimo 8 caracteres"
                      className="block w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-pass-confirm"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Confirmar Contraseña
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <input
                      id="reg-pass-confirm"
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className={`block w-full pl-3 pr-9 py-2 bg-slate-950 border rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all font-mono ${
                        passwordsMatch
                          ? 'border-slate-700/80 focus:ring-blue-500'
                          : 'border-rose-500 focus:ring-rose-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Quality Checklist */}
              {regPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" /> Nivel de Seguridad:
                    </span>
                    <span className={`font-bold ${passwordEvaluation.colorClass}`}>
                      {passwordEvaluation.levelLabel} ({passwordEvaluation.score}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordEvaluation.barColorClass}`}
                      style={{ width: `${passwordEvaluation.score}%` }}
                    />
                  </div>

                  {showCriteria && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800/80 text-[10.5px]">
                      {passwordEvaluation.rules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center gap-1.5 ${
                            rule.passed ? 'text-emerald-400 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {rule.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isProcessing || !passwordsMatch || !passwordEvaluation.isValid}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 text-blue-200" />
                <span>{isProcessing ? 'Creando cuenta...' : 'Registrar Cuenta y Entrar'}</span>
              </motion.button>
            </form>
          )}

          {/* Corporate Security Footer */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sesión Cifrada y Protegida
            </span>
            <span>Acceso Restringido</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
