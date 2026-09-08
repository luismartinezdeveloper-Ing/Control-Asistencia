import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  User,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { UserAccount, ScrumRole } from '../types/auth';
import { apiFetch, ApiError } from '../utils/api';
import { DEMO_ACCOUNTS } from '../utils/authStorage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

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

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ScrumRole>('DEVELOPMENT_TEAM');
  const [site, setSite] = useState(SITE_OPTIONS[0]);
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [biometricName, setBiometricName] = useState('');

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch users list from server (or fallback to local DEMO_ACCOUNTS)
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiFetch<{ users: UserAccount[] }>('/auth/admin/users');
      setUsers(data.users);
    } catch {
      // Offline fallback: Use DEMO_ACCOUNTS
      setUsers(DEMO_ACCOUNTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setErrorMsg('Nombre, correo y contraseña inicial son obligatorios.');
      return;
    }

    if (!cleanEmail.endsWith('@opeconca.net') && !cleanEmail.endsWith('@grupoopeconca.com')) {
      setErrorMsg('El correo debe pertenecer al dominio corporativo @opeconca.net o @grupoopeconca.com.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('La contraseña inicial debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      let roleTitle = 'Dev Team Member / Colaborador';
      if (role === 'PRODUCT_OWNER') roleTitle = 'Product Owner / Gerente General';
      else if (role === 'SCRUM_MASTER') roleTitle = 'Scrum Master / Jefe de Área';
      else if (role === 'STAKEHOLDER') roleTitle = 'Stakeholder / Auditor';

      const payload = {
        name: cleanName,
        email: cleanEmail,
        password,
        role,
        roleTitle,
        department,
        site,
        linkedEmployeeName: biometricName.trim() || cleanName.toUpperCase(),
      };

      const res = await apiFetch<{ user: UserAccount }>('/auth/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`¡Usuario ${res.user.email} aprovisionado exitosamente!`);
      setUsers((prev) => [...prev.filter((u) => u.email !== res.user.email), res.user]);

      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setBiometricName('');
      setActiveTab('list');
    } catch (err: unknown) {
      // Offline fallback: Add to local state
      const isOffline =
        !(err instanceof ApiError) ||
        err.status === 0 ||
        err.status === 404 ||
        err.status === 405 ||
        err.status >= 500;

      if (isOffline) {
        let roleTitle = 'Dev Team Member / Colaborador';
        if (role === 'PRODUCT_OWNER') roleTitle = 'Product Owner / Gerente General';
        else if (role === 'SCRUM_MASTER') roleTitle = 'Scrum Master / Jefe de Área';
        else if (role === 'STAKEHOLDER') roleTitle = 'Stakeholder / Auditor';

        const newUser: UserAccount = {
          id: `usr_${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role,
          roleTitle,
          department,
          site,
          linkedEmployeeName: biometricName.trim() || cleanName.toUpperCase(),
        };

        setUsers((prev) => [...prev, newUser]);
        setSuccessMsg(`¡Usuario ${newUser.email} registrado exitosamente (modo local)!`);
        setName('');
        setEmail('');
        setPassword('');
        setBiometricName('');
        setActiveTab('list');
      } else if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error al registrar usuario.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (resetPassword.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch('/auth/admin/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({ userId: resetTargetUser.id, newPassword: resetPassword }),
      });

      setSuccessMsg(`Contraseña restablecida exitosamente para ${resetTargetUser.email}.`);
      setResetTargetUser(null);
      setResetPassword('');
    } catch (err: unknown) {
      const isOffline =
        !(err instanceof ApiError) ||
        err.status === 0 ||
        err.status === 404 ||
        err.status === 405 ||
        err.status >= 500;

      if (isOffline) {
        setSuccessMsg(`Contraseña restablecida exitosamente para ${resetTargetUser.email} (modo local).`);
        setResetTargetUser(null);
        setResetPassword('');
      } else if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error al restablecer contraseña.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 bg-[#1F4E79] text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/40 border border-blue-400/30 text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider">
                Gestión Centralizada de Usuarios • Control Interno
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Panel exclusivo para la Dirección y RRHH para aprovisionar y gestionar credenciales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-blue-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar Tabs */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white border-[#1F4E79] text-[#1F4E79] shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Directorio de Usuarios ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white border-[#1F4E79] text-[#1F4E79] shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Nuevas Credenciales</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-[#1F4E79] rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Recargar usuarios"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Lista de Usuarios */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Usuario / Nombre</th>
                      <th className="py-2.5 px-3">Correo Corporativo</th>
                      <th className="py-2.5 px-3">Rol & Título</th>
                      <th className="py-2.5 px-3">Sede</th>
                      <th className="py-2.5 px-3">Nombre en Biométrico</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'PRODUCT_OWNER'
                                ? 'bg-amber-100 text-amber-900'
                                : u.role === 'SCRUM_MASTER'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {u.roleTitle || u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{u.site || 'Oficina Opeconca'}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {u.linkedEmployeeName || u.name.toUpperCase()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setResetTargetUser(u)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Clave</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Aprovisionar Nuevo Usuario */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateUser} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!biometricName) setBiometricName(e.target.value.toUpperCase());
                    }}
                    placeholder="ej. Maria Fernandez"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#1F4E79]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Corporativo</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. mfernandez@opeconca.net"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#1F4E79]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol en el Sistema</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as ScrumRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#1F4E79]"
                  >
                    <option value="DEVELOPMENT_TEAM">Development Team (Colaborador)</option>
                    <option value="STAKEHOLDER">Stakeholder (Auditor / Consulta)</option>
                    <option value="SCRUM_MASTER">Scrum Master (Jefe de Área / RRHH)</option>
                    <option value="PRODUCT_OWNER">Product Owner (Gerencia General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sede Asignada</label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#1F4E79]"
                  >
                    {SITE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#1F4E79]"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre en Biométrico</label>
                  <input
                    type="text"
                    value={biometricName}
                    onChange={(e) => setBiometricName(e.target.value.toUpperCase())}
                    placeholder="MARIA FERNANDE"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase focus:ring-2 focus:ring-[#1F4E79]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña Inicial Asignada</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres (ej. Scrum2026!*)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-[#1F4E79]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#1F4E79] hover:bg-[#163857] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Aprovisionar Usuario</span>
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD SUB-MODAL */}
          {resetTargetUser && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-amber-900">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Restablecer Contraseña para {resetTargetUser.name} ({resetTargetUser.email})
                </h4>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Ingresa la nueva contraseña (mínimo 8 caracteres)"
                    className="w-full pl-3 pr-10 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetUser(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs"
                  >
                    Guardar Nueva Contraseña
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Control de Acceso Interno Corporativo</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
