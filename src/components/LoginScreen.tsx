import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileKey,
  Building2,
  Info,
} from 'lucide-react';
import { UserAccount } from '../types/auth';
import { loginUser, saveStoredCurrentUser } from '../utils/authStorage';

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Por favor ingresa tu correo electrónico corporativo.');
      return;
    }

    if (!cleanEmail.endsWith('@opeconca.net') && !cleanEmail.endsWith('@grupoopeconca.com')) {
      setErrorMsg(
        'Acceso restringido: El correo debe pertenecer exclusivamente al dominio corporativo @opeconca.net o @grupoopeconca.com.'
      );
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

      saveStoredCurrentUser(authResult.user);
      onLogin(authResult.user);
    } catch {
      setErrorMsg('Ocurrió un error inesperado al validar la sesión. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden font-sans">
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
          className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-[#1F4E79] to-blue-700 rounded-2xl shadow-xl shadow-blue-950/50 mb-3 border border-blue-400/30"
        >
          <ShieldCheck className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Portal de Control de Asistencia
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Sistema Cerrado • Acceso exclusivo para personal autorizado por Control Interno.
        </p>
      </motion.div>

      {/* Main Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-slate-900/90 backdrop-blur-md py-7 px-6 shadow-2xl rounded-2xl sm:px-9 border border-slate-800 space-y-5">
          {/* Internal Security Badge Header */}
          <div className="flex items-center justify-between p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-blue-300 font-semibold">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Acceso Corporativo Protegido</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">
              Sistema Cerrado
            </span>
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

          {/* Login Form */}
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
                  placeholder="ej. lmartinez@opeconca.net"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Dominios permitidos: <span className="font-semibold text-blue-400">@opeconca.net</span> / <span className="font-semibold text-blue-400">@grupoopeconca.com</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Contraseña de Acceso
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
          </form>

          {/* Internal Provisioning Info Callout */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              El auto-registro público se encuentra desactivado. Si requieres nuevas credenciales o cambio de perfil, contacta a la Dirección de Recursos Humanos o Control Interno.
            </p>
          </div>

          {/* Corporate Security Footer */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sesión Cifrada
            </span>
            <span>Acceso Restringido</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
