import React, { useState } from 'react';
import { Driver, Bus } from '@college-bus/shared';
import { 
  Users, Plus, Search, Edit2, Trash2, Phone, CreditCard, X, RefreshCw, 
  Key, Eye, EyeOff, Check, Copy, ShieldCheck, AlertTriangle, Smartphone
} from 'lucide-react';

interface DriversProps {
  drivers: Driver[];
  buses: Bus[];
  onSaveDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Drivers: React.FC<DriversProps> = ({
  drivers,
  buses,
  onSaveDriver,
  onDeleteDriver,
  onSubstituteDriver,
  onRevertSubstituteDriver,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Quick Password Reset Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetDriver, setPasswordTargetDriver] = useState<Driver | null>(null);
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('driver123');
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [assignedBusId, setAssignedBusId] = useState('');

  // Password Reveal & Copy feedback for driver cards
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const togglePasswordVisibility = (driverId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [driverId]: !prev[driverId],
    }));
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'DRV-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const openCreateModal = () => {
    setEditingDriver(null);
    setName('');
    setEmail(`driver${drivers.length + 1}@ritrjpm.ac.in`);
    setPhone('98' + Math.floor(10000000 + Math.random() * 90000000));
    setPassword('driver123');
    setShowPassword(false);
    setEmployeeId(`EMP-DRV-${String(drivers.length + 1).padStart(2, '0')}`);
    setLicenseNumber(`TN-84-2024-00${drivers.length + 1}`);
    setAssignedBusId('');
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.profile?.name || '');
    setEmail(driver.profile?.email || '');
    setPhone(driver.phone || '');
    setPassword(driver.password || 'driver123');
    setShowPassword(false);
    setEmployeeId(driver.employee_id || '');
    setLicenseNumber(driver.license_number || '');
    setAssignedBusId(driver.assigned_bus_id || '');
    setIsModalOpen(true);
  };

  const openPasswordModal = (driver: Driver) => {
    setPasswordTargetDriver(driver);
    setNewQuickPassword(driver.password || 'driver123');
    setShowQuickPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleSaveQuickPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetDriver) return;

    const updated: Driver = {
      ...passwordTargetDriver,
      password: newQuickPassword || 'driver123',
    };

    onSaveDriver(updated);
    setIsPasswordModalOpen(false);
    setPasswordTargetDriver(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Driver = {
      id: editingDriver ? editingDriver.id : 'd_' + Date.now(),
      user_id: editingDriver ? editingDriver.user_id : 'u_' + Date.now(),
      employee_id: employeeId,
      license_number: licenseNumber,
      phone,
      password: password || 'driver123',
      assigned_bus_id: assignedBusId || null,
      status: 'active',
      profile: {
        id: editingDriver?.profile?.id || 'prof_' + Date.now(),
        auth_user_id: editingDriver?.profile?.auth_user_id || 'auth_' + Date.now(),
        name,
        email,
        phone,
        role: 'driver',
        status: 'active',
      }
    };

    onSaveDriver(updated);
    setIsModalOpen(false);
  };

  const filteredDrivers = drivers.filter(d => 
    (d.profile?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm)
  );

  // Check which drivers have active substitutions
  const substituteActiveBuses = buses.filter(b => !!b.substitute_driver_id);

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <Users className="w-7 h-7 text-purple-500" />
            <span>Driver Personnel & App Login Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage licensed drivers, configure mobile app login credentials (phone number & password), and monitor bus assignments.
          </p>
        </div>

        {isEditable ? (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Driver</span>
          </button>
        ) : (
          <span className="px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-xs border border-slate-700">
            View-Only Mode
          </span>
        )}
      </div>

      {/* Driver Login Info Banner */}
      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-300">
        <div className="flex items-center space-x-2.5">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Driver App Login Architecture:</strong> Drivers log in to the mobile application using their <strong>Registered Phone Number</strong> and <strong>Assigned Password</strong>. You can view, edit, or reset any driver's password below.
          </span>
        </div>
      </div>

      {/* Active Substitutions Notice */}
      {substituteActiveBuses.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{substituteActiveBuses.length} Driver Substitution(s) Active</strong>: Temporary substitute drivers are currently operating buses. You can revert any driver back to regular duty anytime.
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by driver name, phone, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold hidden sm:block">
          Total Staff: {drivers.length} Drivers
        </div>
      </div>

      {/* Driver Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map(driver => {
          const assignedBus = buses.find(b => b.id === driver.assigned_bus_id || b.assigned_driver_id === driver.id);
          const isReplacedBySub = assignedBus && !!assignedBus.substitute_driver_id && assignedBus.substitute_driver_id !== driver.id;
          const subOperatingDriver = isReplacedBySub ? drivers.find(d => d.id === assignedBus.substitute_driver_id) : null;
          
          const busWhereSubbing = buses.find(b => b.substitute_driver_id === driver.id);
          const originalDriverOfSubBus = busWhereSubbing ? drivers.find(d => d.id === busWhereSubbing.assigned_driver_id) : null;

          const isPasswordVisible = !!revealedPasswords[driver.id];
          const driverPassword = driver.password || 'driver123';

          return (
            <div key={driver.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-lg">
                      {driver.profile?.name ? driver.profile.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {driver.profile?.name || 'Driver Name'}
                      </h3>
                      <p className="text-xs font-mono text-purple-400 font-semibold">{driver.employee_id}</p>
                    </div>
                  </div>

                  {isEditable ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openPasswordModal(driver)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                        title="Set / Change App Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(driver)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                        title="Edit Driver Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove driver ${driver.profile?.name}?`)) {
                            onDeleteDriver(driver.id);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete Driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-700">
                      Read Only
                    </span>
                  )}
                </div>

                {/* APP LOGIN CREDENTIALS PANEL */}
                <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      Driver App Login Credentials
                    </span>
                    <span className="text-slate-500 font-normal">Used in App</span>
                  </div>

                  {/* Phone Login Username */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Phone (Login):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white">{driver.phone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(driver.phone.replace(/[^0-9]/g, ''), `phone_${driver.id}`)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy Phone Number"
                      >
                        {copiedKey === `phone_${driver.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 flex items-center">
                      <Key className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Password:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-400">
                        {isPasswordVisible ? driverPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(driver.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(driverPassword, `pass_${driver.id}`)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy Password"
                      >
                        {copiedKey === `pass_${driver.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => openPasswordModal(driver)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold border border-slate-700"
                          title="Change Password"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* SUBSTITUTION STATUS BADGES */}
                {isReplacedBySub && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
                    <div className="font-bold flex items-center space-x-1">
                      <span>⚠️ On Temporary Leave</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Substituted by <strong className="text-amber-400">{subOperatingDriver?.profile?.name || 'Substitute'}</strong> on {assignedBus?.bus_number}
                    </div>
                    {isEditable && onRevertSubstituteDriver && assignedBus && (
                      <button
                        onClick={() => onRevertSubstituteDriver(assignedBus.id)}
                        className="mt-1 w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg flex items-center justify-center space-x-1 shadow transition-all"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resume Duty & Restore {driver.profile?.name?.split(' ')[0] || 'Driver'}</span>
                      </button>
                    )}
                  </div>
                )}

                {busWhereSubbing && (
                  <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs text-blue-300 space-y-1.5">
                    <div className="font-bold flex items-center space-x-1">
                      <span>👨‍✈️ Acting as Temporary Substitute</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Operating <strong className="text-blue-400">{busWhereSubbing.bus_number}</strong> (Regular: {originalDriverOfSubBus?.profile?.name || 'Regular Driver'})
                    </div>
                    {isEditable && onRevertSubstituteDriver && (
                      <button
                        onClick={() => onRevertSubstituteDriver(busWhereSubbing.id)}
                        className="mt-1 w-full py-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-[11px] rounded-lg flex items-center justify-center space-x-1 shadow transition-all"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>End Substitution Duty</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center">
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> License No:
                  </span>
                  <span className="font-mono text-slate-300">{driver.license_number}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Regular Bus:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-lg text-[11px] ${
                    assignedBus ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30' : 'text-slate-500'
                  }`}>
                    {assignedBus?.bus_number || 'Unassigned (Reserve Driver)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK PASSWORD MODAL */}
      {isPasswordModalOpen && passwordTargetDriver && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Set Driver App Password</h2>
                  <p className="text-xs text-slate-400">{passwordTargetDriver.profile?.name} ({passwordTargetDriver.employee_id})</p>
                </div>
              </div>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPassword} className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="text-slate-400">Driver Phone (Sign-in ID):</div>
                <div className="font-mono font-bold text-white text-sm">{passwordTargetDriver.phone}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password / PIN for Driver App
                </label>
                <div className="relative">
                  <input
                    type={showQuickPassword ? 'text' : 'password'}
                    required
                    value={newQuickPassword}
                    onChange={(e) => setNewQuickPassword(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Enter password (e.g. driver123)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPassword(!showQuickPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewQuickPassword('driver123')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                >
                  Set to Default (driver123)
                </button>
                <button
                  type="button"
                  onClick={() => setNewQuickPassword(generateRandomPassword())}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Generate PIN
                </button>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
                ℹ️ The driver will use their mobile number <strong>{passwordTargetDriver.phone}</strong> and this password to sign in to the mobile cockpit.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-md"
                >
                  Save & Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DRIVER EDIT / CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingDriver ? 'Edit Driver & Login Credentials' : 'Register New Driver'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                  placeholder="Mr. B. Moorthi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                    placeholder="EMP-DRV-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Driving License No.</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                    placeholder="TN-67-2015-001"
                  />
                </div>
              </div>

              {/* APP LOGIN CREDENTIALS SECTION */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile App Login Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Phone Number (Sign-in ID)
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 font-mono"
                      placeholder="9894668646"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-400">
                        App Password / PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-purple-400 hover:text-purple-300"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 text-white text-sm pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 font-mono"
                        placeholder="driver123"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPassword('driver123')}
                    className="px-2 py-1 rounded bg-slate-900 text-[10.5px] font-semibold text-slate-400 hover:text-white border border-slate-800"
                  >
                    Default (driver123)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassword(generateRandomPassword())}
                    className="px-2 py-1 rounded bg-slate-900 text-[10.5px] font-semibold text-purple-400 hover:text-purple-300 border border-slate-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto-Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address (Optional Record)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                  placeholder="driver@ritrjpm.ac.in"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Bus</label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- No Bus Assigned (Reserve Pool) --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.bus_number} ({b.bus_name})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30"
                >
                  Save Driver & Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
