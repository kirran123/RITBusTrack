import React, { useState } from 'react';
import { StaffUser, StaffAccessLevel, Route, UserProfile } from '@college-bus/shared';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  X,
  Sparkles,
  Shield,
  ShieldAlert,
  ArrowRight,
  LogIn,
  RotateCcw
} from 'lucide-react';

interface StaffProps {
  staffList: StaffUser[];
  routes: Route[];
  currentUser?: UserProfile | null;
  onSaveStaff: (staff: StaffUser) => void;
  onDeleteStaff: (staffId: string) => void;
  onToggleStaffAccess: (staffId: string) => void;
  onUpdateStaffPassword: (staffId: string, newPass: string) => void;
  onSimulateLoginAsStaff?: (staff: StaffUser) => void;
}

export const Staff: React.FC<StaffProps> = ({
  staffList,
  routes,
  currentUser,
  onSaveStaff,
  onDeleteStaff,
  onToggleStaffAccess,
  onUpdateStaffPassword,
  onSimulateLoginAsStaff,
}) => {
  const isSuperAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccess, setFilterAccess] = useState<'all' | 'edit' | 'view'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('staff123');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Transport Department');
  const [designation, setDesignation] = useState('Faculty Transport Coordinator');
  const [accessLevel, setAccessLevel] = useState<StaffAccessLevel>('edit');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Password Control Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetStaffForPassword, setTargetStaffForPassword] = useState<StaffUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail(`staff${staffList.length + 1}@college.edu`);
    setPassword('staff123');
    setPhone('+91 98421 ' + (10000 + staffList.length + 1));
    setDepartment('Transport Department');
    setDesignation('Faculty Transport Coordinator');
    setAccessLevel('view');
    setSelectedRoutes(routes.map(r => r.id));
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (stf: StaffUser) => {
    setEditingStaff(stf);
    setName(stf.name);
    setEmail(stf.email);
    setPassword(stf.password || 'staff123');
    setPhone(stf.phone);
    setDepartment(stf.department);
    setDesignation(stf.designation);
    setAccessLevel(stf.access_level);
    setSelectedRoutes(stf.assigned_route_ids || []);
    setStatus(stf.status);
    setIsModalOpen(true);
  };

  const openPasswordModal = (stf: StaffUser) => {
    setTargetStaffForPassword(stf);
    setNewPasswordValue(stf.password || 'staff123');
    setIsPasswordModalOpen(true);
  };

  const handleSaveStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStaff: StaffUser = {
      id: editingStaff ? editingStaff.id : 'stf_' + Date.now(),
      auth_user_id: editingStaff ? editingStaff.auth_user_id : 'auth_stf_' + Date.now(),
      name,
      email,
      password,
      phone,
      department,
      designation,
      access_level: accessLevel,
      assigned_route_ids: selectedRoutes,
      status,
      created_at: editingStaff ? editingStaff.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveStaff(updatedStaff);
    setIsModalOpen(false);
    triggerToast(editingStaff ? `💾 Updated staff profile for "${name}"` : `✨ Created login credentials for "${name}" (${accessLevel.toUpperCase()} access)`);
  };

  const handleSavePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaffForPassword || !newPasswordValue.trim()) return;
    onUpdateStaffPassword(targetStaffForPassword.id, newPasswordValue);
    setIsPasswordModalOpen(false);
    triggerToast(`🔑 Password updated successfully for "${targetStaffForPassword.name}"`);
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAccess = filterAccess === 'all' || s.access_level === filterAccess;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchesSearch && matchesAccess && matchesStatus;
  });

  const totalStaff = staffList.length;
  const editAccessCount = staffList.filter(s => s.access_level === 'edit').length;
  const viewOnlyCount = staffList.filter(s => s.access_level === 'view').length;
  const activeCount = staffList.filter(s => s.status === 'active').length;

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Super Admin Access Only</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Viewing, reading, and managing staff logins and security permissions is confidential and restricted strictly to <strong>Super Administrators</strong>.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all"
            >
              <span>Return to Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span>Admin Staff & Web Control Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            <strong>Super Admin Control Panel:</strong> Create and manage web portal logins for operations staff, assign passwords, and toggle <strong>Edit Access</strong> vs <strong>View-Only</strong> permissions.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Create Admin Staff Login</span>
          </button>
        )}
      </div>

      {/* Super Admin Notice if logged in as staff */}
      {!isSuperAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Super Admin Privilege: Creating new staff logins and modifying staff credentials/access tiers is strictly reserved for Super Administrators.</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Staff</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalStaff}</span>
            <span className="text-[11px] text-slate-500">{activeCount} active accounts</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Edit Permissions</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{editAccessCount}</span>
            <span className="text-[11px] text-slate-500">Can manage routes & buses</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Edit2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-sky-400 font-bold uppercase tracking-wider block">View-Only Accounts</span>
            <span className="text-2xl font-black text-sky-400 mt-1 block">{viewOnlyCount}</span>
            <span className="text-[11px] text-slate-500">Read-only live monitoring</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">Password Control</span>
            <span className="text-2xl font-black text-white mt-1 block">Admin Only</span>
            <span className="text-[11px] text-amber-400 font-semibold">100% manageable</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <select
            value={filterAccess}
            onChange={(e) => setFilterAccess(e.target.value as any)}
            className="bg-slate-950 text-xs font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Access Levels</option>
            <option value="edit">✏️ Edit Access Only</option>
            <option value="view">👁️ View-Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-950 text-xs font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Disabled</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStaff.map((staff) => {
          const isEdit = staff.access_level === 'edit';

          return (
            <div
              key={staff.id}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                staff.status === 'active'
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xl'
                  : 'bg-slate-950 border-slate-900 opacity-60'
              }`}
            >
              {/* Card Header: Avatar, Name, Access Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${
                    isEdit
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-600/20'
                      : 'bg-gradient-to-tr from-sky-600 to-blue-600 shadow-sky-600/20'
                  }`}>
                    {staff.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight flex items-center space-x-2">
                      <span>{staff.name}</span>
                      {staff.status !== 'active' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                          DISABLED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{staff.designation}</p>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Building className="w-3 h-3 text-slate-500" />
                      <span>{staff.department}</span>
                    </p>
                  </div>
                </div>

                {/* Access Level Badge */}
                <div className="flex flex-col items-end">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => {
                        onToggleStaffAccess(staff.id);
                        triggerToast(`Switched "${staff.name}" to ${isEdit ? 'VIEW-ONLY' : 'EDIT'} access`);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black border transition-all flex items-center space-x-1.5 shadow-sm ${
                        isEdit
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25'
                      }`}
                      title="Click to toggle between Edit and View-Only access"
                    >
                      {isEdit ? (
                        <>
                          <Edit2 className="w-3 h-3" />
                          <span>EDIT ACCESS</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>VIEW ONLY</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center space-x-1.5 ${
                        isEdit
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                      }`}
                    >
                      {isEdit ? <span>✏️ EDIT ACCESS</span> : <span>👁️ VIEW ONLY</span>}
                    </span>
                  )}
                  {isSuperAdmin && (
                    <span className="text-[10px] text-slate-500 mt-1 cursor-pointer hover:text-slate-400" onClick={() => onToggleStaffAccess(staff.id)}>
                      (click to switch)
                    </span>
                  )}
                </div>
              </div>

              {/* Contact & Password Info Bar */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Login Email:</span>
                  </span>
                  <span className="font-mono font-bold text-white select-all">{staff.email}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Password:</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {isSuperAdmin ? (staff.password || '••••••••') : '••••••••'}
                    </span>
                    {isSuperAdmin && (
                      <button
                        onClick={() => openPasswordModal(staff)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline"
                        title="Reset or Change Password"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phone:</span>
                  </span>
                  <span className="text-slate-300 font-mono">{staff.phone}</span>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                {/* Simulate Login As */}
                {isSuperAdmin && onSimulateLoginAsStaff ? (
                  <button
                    onClick={() => onSimulateLoginAsStaff(staff)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    title="Simulate signing in as this staff member to test their perspective"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login As Staff</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono">ID: {staff.id}</span>
                )}

                {isSuperAdmin && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openPasswordModal(staff)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                      title="Change Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(staff)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete login credentials for "${staff.name}"?`)) {
                          onDeleteStaff(staff.id);
                          triggerToast(`🗑 Removed staff account "${staff.name}"`);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                      title="Delete Staff Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT STAFF LOGIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Create Staff Login & Access'}
                  </h2>
                  <p className="text-xs text-slate-400">Configure login credentials and select Edit or View-Only permission</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Member Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="e.g. Dr. S. Ganesh"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Login Email / Username</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="ganesh.staff@college.edu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 text-white text-xs pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACCESS LEVEL SELECTION: EDIT VS VIEW */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Assign Access Permission Level:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setAccessLevel('edit')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      accessLevel === 'edit'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessLevel === 'edit' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                      }`}>
                        {accessLevel === 'edit' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>EDIT ACCESS</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Can edit routes, stops, reassign substitute drivers, swap standby buses & mark student leaves.
                    </p>
                  </div>

                  <div
                    onClick={() => setAccessLevel('view')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      accessLevel === 'view'
                        ? 'bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        accessLevel === 'view' ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                      }`}>
                        {accessLevel === 'view' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <span className="text-xs font-bold text-sky-400 flex items-center space-x-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW ONLY</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Read-only dashboard, map & student manifest tracking. Modifying actions are restricted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Transport Department"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Fleet Coordinator"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono"
                    placeholder="+91 98421 22334"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800"
                  >
                    <option value="active">Active (Can Sign In)</option>
                    <option value="inactive">Disabled (Sign In Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  {editingStaff ? 'Save Changes' : 'Create Staff Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CONTROL PASSWORD MODAL */}
      {isPasswordModalOpen && targetStaffForPassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Reset Staff Login Password</h2>
                  <p className="text-xs text-slate-400">{targetStaffForPassword.name} ({targetStaffForPassword.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Set New Password</label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  The staff member will use this password alongside their email to log into the portal.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
