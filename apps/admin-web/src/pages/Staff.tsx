import React, { useState } from 'react';
import { StaffUser, StaffAccessLevel, StaffCommuter, Bus, Route, Stop, UserProfile, RIT_DEPARTMENTS, matchesDepartment } from '@college-bus/shared';
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
  RotateCcw,
  Users,
  Briefcase,
  Key,
  Check,
  Copy,
  RefreshCw,
  Upload,
  FileText
} from 'lucide-react';

interface StaffProps {
  staffList: StaffUser[];
  staffCommuters?: StaffCommuter[];
  buses?: Bus[];
  routes: Route[];
  stops?: Stop[];
  currentUser?: UserProfile | null;
  canEdit?: boolean;
  onSaveStaff: (staff: StaffUser) => void;
  onDeleteStaff: (staffId: string) => void;
  onToggleStaffAccess: (staffId: string) => void;
  onUpdateStaffPassword: (staffId: string, newPass: string) => void;
  onSimulateLoginAsStaff?: (staff: StaffUser) => void;
  onSaveStaffCommuter?: (commuter: StaffCommuter) => void;
  onDeleteStaffCommuter?: (commuterId: string) => void;
  onToggleStaffCommuterLeave?: (commuterId: string) => void;
  onUpdateStaffCommuterPassword?: (commuterId: string, newPass: string) => void;
  onImportStaffCommuterCSV?: (commuters: StaffCommuter[]) => void;
}

export const Staff: React.FC<StaffProps> = ({
  staffList,
  staffCommuters = [],
  buses = [],
  routes = [],
  stops = [],
  currentUser,
  canEdit,
  onSaveStaff,
  onDeleteStaff,
  onToggleStaffAccess,
  onUpdateStaffPassword,
  onSimulateLoginAsStaff,
  onSaveStaffCommuter,
  onDeleteStaffCommuter,
  onToggleStaffCommuterLeave,
  onUpdateStaffCommuterPassword,
  onImportStaffCommuterCSV,
}) => {
  const isSuperAdmin = currentUser?.role === 'admin';
  const isEditable = canEdit !== undefined ? canEdit : (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));

  // Main Section Tab: 'commuters' (Faculty & Staff Bus Passengers) vs 'portal_staff' (Web Portal Admins)
  const [activeSection, setActiveSection] = useState<'commuters' | 'portal_staff'>('commuters');

  // Common Toast
  const [toastMessage, setToastMessage] = useState('');
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // -------------------------------------------------------------
  // SECTION 1: FACULTY & STAFF COMMUTERS STATE
  // -------------------------------------------------------------
  const [commuterSearchTerm, setCommuterSearchTerm] = useState('');
  const [commuterLeaveFilter, setCommuterLeaveFilter] = useState<'all' | 'on_leave' | 'active'>('all');
  const [commuterDepartmentFilter, setCommuterDepartmentFilter] = useState<string>('all');
  const [commuterBusFilter, setCommuterBusFilter] = useState<string>('all');
  const [isCommuterModalOpen, setIsCommuterModalOpen] = useState(false);
  const [isCommuterCSVModalOpen, setIsCommuterCSVModalOpen] = useState(false);
  const [editingCommuter, setEditingCommuter] = useState<StaffCommuter | null>(null);

  // Form State for Staff Commuters
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('staff123');
  const [showCPassword, setShowCPassword] = useState(false);
  const [cEmployeeId, setCEmployeeId] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDepartment, setCDepartment] = useState('Electronics & Communication Engg');
  const [cDesignation, setCDesignation] = useState('Associate Professor');
  const [cBusId, setCBusId] = useState('');
  const [cRouteId, setCRouteId] = useState('');
  const [cBoardingStopId, setCBoardingStopId] = useState('');

  // Quick Password Modal for Staff Commuters
  const [isCommuterPasswordModalOpen, setIsCommuterPasswordModalOpen] = useState(false);
  const [targetCommuterForPassword, setTargetCommuterForPassword] = useState<StaffCommuter | null>(null);
  const [quickCommuterPassword, setQuickCommuterPassword] = useState('');
  const [showQuickCommuterPassword, setShowQuickCommuterPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const generateRandomPassword = (prefix = 'FAC-') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = prefix;
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const openCreateCommuterModal = () => {
    setEditingCommuter(null);
    setCName('');
    setCEmail(`faculty${staffCommuters.length + 1}@ritrjpm.ac.in`);
    setCPassword('staff123');
    setShowCPassword(false);
    setCEmployeeId(`FAC-${String(staffCommuters.length + 10).padStart(3, '0')}`);
    setCPhone('+91 94432 ' + (10000 + staffCommuters.length + 1));
    setCDepartment('Computer Science and Engineering (CSE)');
    setCDesignation('Assistant Professor');
    setCRouteId(routes[0]?.id || '');
    setCBusId(buses[0]?.id || '');
    setCBoardingStopId(stops[0]?.id || '');
    setIsCommuterModalOpen(true);
  };

  const openEditCommuterModal = (commuter: StaffCommuter) => {
    setEditingCommuter(commuter);
    setCName(commuter.name || commuter.profile?.name || '');
    setCEmail(commuter.email || commuter.profile?.email || '');
    setCPassword(commuter.password || 'staff123');
    setShowCPassword(false);
    setCEmployeeId(commuter.employee_id);
    setCPhone(commuter.phone || commuter.profile?.phone || '');
    setCDepartment(commuter.department);
    setCDesignation(commuter.designation);
    setCRouteId(commuter.route_id || '');
    setCBusId(commuter.bus_id || '');
    setCBoardingStopId(commuter.boarding_stop_id || '');
    setIsCommuterModalOpen(true);
  };

  const openCommuterPasswordModal = (commuter: StaffCommuter) => {
    setTargetCommuterForPassword(commuter);
    setQuickCommuterPassword(commuter.password || 'staff123');
    setShowQuickCommuterPassword(false);
    setIsCommuterPasswordModalOpen(true);
  };

  const handleSaveCommuterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCommuter: StaffCommuter = {
      id: editingCommuter ? editingCommuter.id : 'sc_' + Date.now(),
      user_id: editingCommuter ? editingCommuter.user_id : 'u_sc_' + Date.now(),
      employee_id: cEmployeeId,
      name: cName,
      email: cEmail,
      phone: cPhone,
      password: cPassword || 'staff123',
      department: cDepartment,
      designation: cDesignation,
      bus_id: cBusId || null,
      route_id: cRouteId || null,
      boarding_stop_id: cBoardingStopId || null,
      status: 'active',
      is_on_leave: editingCommuter ? editingCommuter.is_on_leave : false,
      profile: {
        id: editingCommuter ? editingCommuter.user_id : 'u_sc_' + Date.now(),
        auth_user_id: 'auth_sc_' + Date.now(),
        name: cName,
        email: cEmail,
        phone: cPhone,
        role: 'staff',
        status: 'active',
      },
      route: routes.find(r => r.id === cRouteId),
      bus: buses.find(b => b.id === cBusId),
      boarding_stop: stops.find(s => s.id === cBoardingStopId),
    };

    if (onSaveStaffCommuter) {
      onSaveStaffCommuter(newCommuter);
    }
    setIsCommuterModalOpen(false);
    triggerToast(editingCommuter ? `💾 Updated pass for "${cName}"` : `✨ Registered faculty commuter "${cName}"`);
  };

  const handleSaveCommuterPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCommuterForPassword) return;
    const finalPass = quickCommuterPassword.trim() || 'staff123';
    
    if (onUpdateStaffCommuterPassword) {
      onUpdateStaffCommuterPassword(targetCommuterForPassword.id, finalPass);
    } else if (onSaveStaffCommuter) {
      onSaveStaffCommuter({
        ...targetCommuterForPassword,
        password: finalPass,
      });
    }
    setIsCommuterPasswordModalOpen(false);
    setTargetCommuterForPassword(null);
    triggerToast(`🔑 Password updated successfully for "${targetCommuterForPassword.name}"`);
  };

  const handleSimulateCommuterCSV = () => {
    const sampleCommuters: StaffCommuter[] = [
      {
        id: 'sc_csv_1',
        user_id: 'u_sc_csv_1',
        employee_id: 'FAC-CIVIL-009',
        name: 'Dr. C. Gnanavel',
        email: 'gnanavel.civil@ritrjpm.ac.in',
        phone: '+91 94431 11223',
        password: 'staff123',
        department: 'Civil Engineering',
        designation: 'Associate Professor',
        bus_id: buses[0]?.id || 'b1',
        route_id: routes[0]?.id || 'r1',
        boarding_stop_id: stops[0]?.id || 'st1',
        status: 'active',
        is_on_leave: false,
        profile: { id: 'u_sc_csv_1', auth_user_id: 'auth_sc1', name: 'Dr. C. Gnanavel', email: 'gnanavel.civil@ritrjpm.ac.in', phone: '+91 94431 11223', role: 'staff', status: 'active' }
      },
      {
        id: 'sc_csv_2',
        user_id: 'u_sc_csv_2',
        employee_id: 'FAC-MATH-022',
        name: 'Dr. T. Manimaran',
        email: 'manimaran.maths@ritrjpm.ac.in',
        phone: '+91 94432 33445',
        password: 'staff123',
        department: 'Science & Humanities',
        designation: 'Assistant Professor (Sr. Gr.)',
        bus_id: buses[0]?.id || 'b1',
        route_id: routes[0]?.id || 'r1',
        boarding_stop_id: stops[1]?.id || 'st2',
        status: 'active',
        is_on_leave: false,
        profile: { id: 'u_sc_csv_2', auth_user_id: 'auth_sc2', name: 'Dr. T. Manimaran', email: 'manimaran.maths@ritrjpm.ac.in', phone: '+91 94432 33445', role: 'staff', status: 'active' }
      }
    ];

    if (onImportStaffCommuterCSV) {
      onImportStaffCommuterCSV(sampleCommuters);
    }
    setIsCommuterCSVModalOpen(false);
    triggerToast('Successfully imported 2 faculty commuter records from CSV!');
  };

  const commuterOnLeaveCount = staffCommuters.filter(c => c.is_on_leave).length;
  const commuterActiveCount = staffCommuters.length - commuterOnLeaveCount;

  const hasActiveCommuterFilters =
    commuterDepartmentFilter !== 'all' ||
    commuterBusFilter !== 'all' ||
    commuterLeaveFilter !== 'all' ||
    commuterSearchTerm.trim() !== '';

  const handleResetCommuterFilters = () => {
    setCommuterSearchTerm('');
    setCommuterLeaveFilter('all');
    setCommuterDepartmentFilter('all');
    setCommuterBusFilter('all');
  };

  const filteredCommuters = staffCommuters.filter((c) => {
    const matchesSearch =
      (c.name || c.profile?.name || '').toLowerCase().includes(commuterSearchTerm.toLowerCase()) ||
      c.employee_id.toLowerCase().includes(commuterSearchTerm.toLowerCase()) ||
      c.department.toLowerCase().includes(commuterSearchTerm.toLowerCase()) ||
      c.designation.toLowerCase().includes(commuterSearchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(commuterSearchTerm.toLowerCase());

    const matchesLeave =
      commuterLeaveFilter === 'all'
        ? true
        : commuterLeaveFilter === 'on_leave'
        ? c.is_on_leave
        : !c.is_on_leave;

    const matchesDept = commuterDepartmentFilter === 'all' || matchesDepartment(c.department, commuterDepartmentFilter);
    const matchesBus = commuterBusFilter === 'all' || c.bus_id === commuterBusFilter || (c.bus?.bus_number === commuterBusFilter);

    return matchesSearch && matchesLeave && matchesDept && matchesBus;
  });

  // -------------------------------------------------------------
  // SECTION 2: PORTAL ADMIN STAFF STATE
  // -------------------------------------------------------------
  const [portalSearchTerm, setPortalSearchTerm] = useState('');
  const [portalFilterAccess, setPortalFilterAccess] = useState<'all' | 'edit' | 'view'>('all');
  const [portalFilterStatus, setPortalFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [editingPortalStaff, setEditingPortalStaff] = useState<StaffUser | null>(null);

  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('staff123');
  const [showPPassword, setShowPPassword] = useState(false);
  const [pPhone, setPPhone] = useState('');
  const [pDepartment, setPDepartment] = useState('Transport Department');
  const [pDesignation, setPDesignation] = useState('Faculty Transport Coordinator');
  const [pAccessLevel, setPAccessLevel] = useState<StaffAccessLevel>('edit');
  const [pSelectedRoutes, setPSelectedRoutes] = useState<string[]>([]);
  const [pStatus, setPStatus] = useState<'active' | 'inactive'>('active');

  const [isPortalPasswordModalOpen, setIsPortalPasswordModalOpen] = useState(false);
  const [targetPortalStaffForPassword, setTargetPortalStaffForPassword] = useState<StaffUser | null>(null);
  const [newPortalPasswordValue, setNewPortalPasswordValue] = useState('');
  const [showPortalModalPassword, setShowPortalModalPassword] = useState(false);

  const openCreatePortalModal = () => {
    setEditingPortalStaff(null);
    setPName('');
    setPEmail(`staff${staffList.length + 1}@ritrjpm.ac.in`);
    setPPassword('staff123');
    setPPhone('+91 98421 ' + (10000 + staffList.length + 1));
    setPDepartment('Transport Department');
    setPDesignation('Faculty Transport Coordinator');
    setPAccessLevel('view');
    setPSelectedRoutes(routes.map(r => r.id));
    setPStatus('active');
    setIsPortalModalOpen(true);
  };

  const openEditPortalModal = (stf: StaffUser) => {
    setEditingPortalStaff(stf);
    setPName(stf.name);
    setPEmail(stf.email);
    setPPassword(stf.password || 'staff123');
    setPPhone(stf.phone);
    setPDepartment(stf.department);
    setPDesignation(stf.designation);
    setPAccessLevel(stf.access_level);
    setPSelectedRoutes(stf.assigned_route_ids || []);
    setPStatus(stf.status);
    setIsPortalModalOpen(true);
  };

  const openPortalPasswordModal = (stf: StaffUser) => {
    setTargetPortalStaffForPassword(stf);
    setNewPortalPasswordValue(stf.password || 'staff123');
    setIsPortalPasswordModalOpen(true);
  };

  const handleSavePortalStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStaff: StaffUser = {
      id: editingPortalStaff ? editingPortalStaff.id : 'stf_' + Date.now(),
      auth_user_id: editingPortalStaff ? editingPortalStaff.auth_user_id : 'auth_stf_' + Date.now(),
      name: pName,
      email: pEmail,
      password: pPassword,
      phone: pPhone,
      department: pDepartment,
      designation: pDesignation,
      access_level: pAccessLevel,
      assigned_route_ids: pSelectedRoutes,
      status: pStatus,
      created_at: editingPortalStaff ? editingPortalStaff.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveStaff(updatedStaff);
    setIsPortalModalOpen(false);
    triggerToast(editingPortalStaff ? `💾 Updated staff profile for "${pName}"` : `✨ Created login credentials for "${pName}" (${pAccessLevel.toUpperCase()} access)`);
  };

  const handleSavePortalPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPortalStaffForPassword || !newPortalPasswordValue.trim()) return;
    onUpdateStaffPassword(targetPortalStaffForPassword.id, newPortalPasswordValue);
    setIsPortalPasswordModalOpen(false);
    triggerToast(`🔑 Password updated successfully for "${targetPortalStaffForPassword.name}"`);
  };

  const filteredPortalStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(portalSearchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(portalSearchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(portalSearchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(portalSearchTerm.toLowerCase());

    const matchesAccess = portalFilterAccess === 'all' || s.access_level === portalFilterAccess;
    const matchesStatus = portalFilterStatus === 'all' || s.status === portalFilterStatus;

    return matchesSearch && matchesAccess && matchesStatus;
  });

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
              <Briefcase className="w-6 h-6" />
            </div>
            <span>Faculty & Staff Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage daily bus pass allocations for faculty commuters, app passwords, daily attendance, and portal administrative access.
          </p>
        </div>

        {/* Action Button based on active tab */}
        {isEditable && (
          <div className="flex items-center space-x-3">
            {activeSection === 'commuters' ? (
              <>
                <button
                  onClick={() => setIsCommuterCSVModalOpen(true)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Import CSV</span>
                </button>
                <button
                  onClick={openCreateCommuterModal}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>Register Staff Pass</span>
                </button>
              </>
            ) : (
              isSuperAdmin && (
                <button
                  onClick={openCreatePortalModal}
                  className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Portal Staff Login</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center space-x-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 w-full sm:w-fit">
        <button
          onClick={() => setActiveSection('commuters')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2.5 ${
            activeSection === 'commuters'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty & Staff Commuters ({staffCommuters.length})</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
            Bus Travelers
          </span>
        </button>

        <button
          onClick={() => setActiveSection('portal_staff')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2.5 ${
            activeSection === 'portal_staff'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Transport Portal Staff ({staffList.length})</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
            Admin & Coordinators
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FACULTY & STAFF COMMUTERS (BUS PASSENGERS & MOBILE APP USERS)       */}
      {/* ========================================================================= */}
      {activeSection === 'commuters' && (
        <div className="space-y-6">
          {/* Commuters Filter & Search Control Section */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search staff by name, employee ID, department, email..."
                  value={commuterSearchTerm}
                  onChange={(e) => setCommuterSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>

              {/* Leave Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setCommuterLeaveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    commuterLeaveFilter === 'all'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  All Faculty ({staffCommuters.length})
                </button>
                <button
                  onClick={() => setCommuterLeaveFilter('on_leave')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer ${
                    commuterLeaveFilter === 'on_leave'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                      : 'bg-slate-950 text-rose-400 border-rose-900/40 hover:bg-rose-950/20'
                  }`}
                >
                  <span>⛔ On Leave ({commuterOnLeaveCount})</span>
                </button>
                <button
                  onClick={() => setCommuterLeaveFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    commuterLeaveFilter === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Travelling ({commuterActiveCount})
                </button>
              </div>
            </div>

            {/* Multi-Section Dropdown Filters (Department, Bus) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1. Department Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏛️ Department</span>
                </label>
                <select
                  value={commuterDepartmentFilter}
                  onChange={(e) => setCommuterDepartmentFilter(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="all">All 10 Departments ({staffCommuters.length})</option>
                  {RIT_DEPARTMENTS.map(dept => {
                    const count = staffCommuters.filter(c => matchesDepartment(c.department, dept.code)).length;
                    return (
                      <option key={dept.code} value={dept.code}>
                        {dept.code} — {dept.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Bus Allocation Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚌 Bus Number</span>
                </label>
                <select
                  value={commuterBusFilter}
                  onChange={(e) => setCommuterBusFilter(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="all">All Allocated Buses ({buses.length})</option>
                  {buses.map(b => {
                    const count = staffCommuters.filter(c => c.bus_id === b.id || c.bus?.bus_number === b.bus_number).length;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} — {b.bus_name} ({count} faculty)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. Active Results & Reset Button */}
              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Showing Results</span>
                  <span className="text-emerald-400 font-mono font-bold">{filteredCommuters.length} / {staffCommuters.length}</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetCommuterFilters}
                  disabled={!hasActiveCommuterFilters}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                    hasActiveCommuterFilters
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                      : 'bg-slate-950/60 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            </div>
          </div>

          {/* Commuters Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Staff Member</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Employee ID</th>
                    <th className="px-3.5 py-3.5">Department & Designation</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Assigned Bus</th>
                    <th className="px-3.5 py-3.5">Boarding Stop</th>
                    <th className="px-3.5 py-3.5 text-center whitespace-nowrap">Attendance Status</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">{isEditable ? 'Actions' : 'Access'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCommuters.map((commuter) => {
                    const bus = buses.find(b => b.id === commuter.bus_id) || commuter.bus;
                    const stop = stops.find(s => s.id === commuter.boarding_stop_id) || commuter.boarding_stop;

                    return (
                      <tr key={commuter.id} className="hover:bg-slate-850/60 transition-colors">
                        {/* Name & Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2.5 min-w-[150px]">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-blue-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                              {(commuter.name || commuter.profile?.name || 'F').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white text-xs leading-tight truncate">
                                {commuter.name || commuter.profile?.name}
                              </div>
                              <div className="text-[10.5px] text-slate-400 font-normal truncate">
                                {commuter.email || commuter.profile?.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-950 text-indigo-400 border border-slate-800/80">
                            {commuter.employee_id}
                          </span>
                        </td>

                        {/* Department & Designation */}
                        <td className="px-3.5 py-3 max-w-[180px]">
                          <div className="text-xs font-semibold text-slate-200 truncate" title={commuter.department}>
                            {commuter.department}
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-medium truncate" title={commuter.designation}>
                            {commuter.designation}
                          </div>
                        </td>

                        {/* Assigned Bus */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {bus?.bus_number || 'BUS-01'}
                          </span>
                        </td>

                        {/* Boarding Stop */}
                        <td className="px-3.5 py-3 max-w-[170px]">
                          <div className="flex items-center space-x-1 text-sky-300 text-xs font-semibold truncate" title={stop?.stop_name || 'N/A'}>
                            <span className="shrink-0 text-[11px]">📍</span>
                            <span className="truncate">{stop?.stop_name || 'PACR Mill Circle'}</span>
                          </div>
                        </td>

                        {/* Attendance Status */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {isEditable && onToggleStaffCommuterLeave ? (
                            <button
                              type="button"
                              onClick={() => onToggleStaffCommuterLeave(commuter.id)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm border ${
                                commuter.is_on_leave
                                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30'
                              }`}
                              title={commuter.is_on_leave ? "Click to restore attendance" : "Click to mark 1-day absence"}
                            >
                              {commuter.is_on_leave ? (
                                <>
                                  <span>⛔</span>
                                  <span>On Leave</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Travelling</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center space-x-1 border ${
                              commuter.is_on_leave
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {commuter.is_on_leave ? '⛔ On Leave' : '🟢 Travelling'}
                            </span>
                          )}
                        </td>

                        {/* Actions Toolbar */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isEditable ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => openCommuterPasswordModal(commuter)}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1 transition-colors"
                                title="Set Login Password for Staff App"
                              >
                                <Key className="w-3 h-3" />
                                <span className="text-[11px] hidden xl:inline">Password</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCommuterModal(commuter)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Edit Commuter Pass"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove commuter pass for "${commuter.name}"?`)) {
                                    if (onDeleteStaffCommuter) onDeleteStaffCommuter(commuter.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Delete Commuter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                              View
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRANSPORT PORTAL STAFF (ADMINISTRATORS & COORDINATORS)             */}
      {/* ========================================================================= */}
      {activeSection === 'portal_staff' && (
        <div className="space-y-6">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Portal Staff</span>
                <span className="text-2xl font-black text-white mt-1 block">{staffList.length}</span>
                <span className="text-[11px] text-slate-500">{staffList.filter(s => s.status === 'active').length} active accounts</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Edit Permissions</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {staffList.filter(s => s.access_level === 'edit').length}
                </span>
                <span className="text-[11px] text-slate-500">Can manage routes & buses</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Edit2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-400 font-bold uppercase tracking-wider block">View-Only Accounts</span>
                <span className="text-2xl font-black text-sky-400 mt-1 block">
                  {staffList.filter(s => s.access_level === 'view').length}
                </span>
                <span className="text-[11px] text-slate-500">Read-only live monitoring</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">Portal Password Control</span>
                <span className="text-2xl font-black text-white mt-1 block">Super Admin</span>
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
                value={portalSearchTerm}
                onChange={(e) => setPortalSearchTerm(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <select
                value={portalFilterAccess}
                onChange={(e) => setPortalFilterAccess(e.target.value as any)}
                className="bg-slate-950 text-xs font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Access Levels</option>
                <option value="edit">Edit Access Only</option>
                <option value="view">View Only</option>
              </select>

              <select
                value={portalFilterStatus}
                onChange={(e) => setPortalFilterStatus(e.target.value as any)}
                className="bg-slate-950 text-xs font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Accounts</option>
                <option value="inactive">Disabled Accounts</option>
              </select>
            </div>
          </div>

          {/* Portal Staff Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Staff Coordinator</th>
                    <th className="px-3.5 py-3.5">Department & Role</th>
                    <th className="px-3.5 py-3.5 text-center">Portal Permission</th>
                    <th className="px-3.5 py-3.5">Assigned Routes</th>
                    <th className="px-3.5 py-3.5 text-center">Account Status</th>
                    <th className="px-4 py-3.5 text-right">Actions & Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPortalStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs leading-tight">{staff.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{staff.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <div className="font-semibold text-slate-200 text-xs">{staff.designation}</div>
                        <div className="text-[11px] text-slate-400">{staff.department}</div>
                      </td>

                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-extrabold inline-flex items-center space-x-1.5 border ${
                            staff.access_level === 'edit'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          }`}
                        >
                          {staff.access_level === 'edit' ? <Edit2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{staff.access_level === 'edit' ? 'EDIT ACCESS' : 'VIEW ONLY'}</span>
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <div className="text-xs text-slate-300 font-medium">
                          {staff.assigned_route_ids && staff.assigned_route_ids.length > 0 ? (
                            <span>{staff.assigned_route_ids.length} Designated Routes</span>
                          ) : (
                            <span className="text-slate-500">All System Routes</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            staff.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {staff.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openPortalPasswordModal(staff)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Reset Portal Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditPortalModal(staff)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Staff Permissions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {onSimulateLoginAsStaff && (
                            <button
                              onClick={() => onSimulateLoginAsStaff(staff)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center space-x-1"
                              title="Test Portal Session"
                            >
                              <LogIn className="w-3 h-3 text-sky-400" />
                              <span>Switch</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Delete staff member "${staff.name}"?`)) {
                                onDeleteStaff(staff.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* 1. Quick Password Reset Modal for Staff Commuter */}
      {isCommuterPasswordModalOpen && targetCommuterForPassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Staff App Login Password</h2>
                  <p className="text-xs text-slate-400">
                    {targetCommuterForPassword.name} ({targetCommuterForPassword.employee_id})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCommuterPasswordModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommuterPasswordSubmit} className="space-y-4">
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Institutional Staff Email</span>
                  <span className="text-[11px] font-mono text-indigo-400">{targetCommuterForPassword.employee_id}</span>
                </div>
                <div className="font-semibold text-white text-xs truncate">
                  {targetCommuterForPassword.email || `faculty@ritrjpm.ac.in`}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Set New App Password</label>
                  <button
                    type="button"
                    onClick={() => setQuickCommuterPassword(generateRandomPassword('FAC-'))}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showQuickCommuterPassword ? 'text' : 'password'}
                    required
                    value={quickCommuterPassword}
                    onChange={(e) => setQuickCommuterPassword(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 pr-20"
                    placeholder="Enter new password"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickCommuterPassword(!showQuickCommuterPassword)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title={showQuickCommuterPassword ? 'Hide password' : 'Show password'}
                    >
                      {showQuickCommuterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(quickCommuterPassword, 'commuter-quick-pass')}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Copy password"
                    >
                      {copiedKey === 'commuter-quick-pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  The faculty member will use this password alongside their institutional email to log into the mobile bus tracking app.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCommuterPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create / Edit Staff Commuter Modal */}
      {isCommuterModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingCommuter ? `Edit Staff Pass: ${editingCommuter.name}` : 'Register Faculty / Staff Commuter'}
                  </h2>
                  <p className="text-xs text-slate-400">Assign bus, boarding stop, employee ID, and app login credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsCommuterModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommuterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Member Full Name</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="e.g. Dr. S. Kanthimathi"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="kanthimathi.ece@ritrjpm.ac.in"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile App Password</label>
                  <div className="relative">
                    <input
                      type={showCPassword ? 'text' : 'password'}
                      required
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      className="w-full bg-slate-950 text-white text-xs pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="staff123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCPassword(!showCPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showCPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Employee ID / Staff Code</label>
                  <input
                    type="text"
                    required
                    value={cEmployeeId}
                    onChange={(e) => setCEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="FAC-ECE-042"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono"
                    placeholder="+91 94432 87654"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                  <select
                    value={cDepartment}
                    onChange={(e) => setCDepartment(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {RIT_DEPARTMENTS.map(d => (
                      <option key={d.code} value={`${d.name} (${d.code})`}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={cDesignation}
                    onChange={(e) => setCDesignation(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Associate Professor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>🚌 Select Bus Route</span>
                  {cRouteId && <span className="text-[10px] text-sky-400 font-semibold">Active Route</span>}
                </label>
                <select
                  value={cRouteId}
                  onChange={(e) => {
                    const newRouteId = e.target.value;
                    setCRouteId(newRouteId);
                    const matchedBus = buses.find(b => b.route_id === newRouteId);
                    if (matchedBus) setCBusId(matchedBus.id);
                    const routeStops = stops.filter(s => s.route_id === newRouteId);
                    if (routeStops.length > 0 && !routeStops.some(s => s.id === cBoardingStopId)) {
                      setCBoardingStopId(routeStops[0].id);
                    }
                  }}
                  className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.route_name || r.name} ({r.route_number || 'Route'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Bus</label>
                  <select
                    value={cBusId}
                    onChange={(e) => setCBusId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Bus --</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} {b.registration_number ? `(${b.registration_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const availableStops = cRouteId ? stops.filter(s => s.route_id === cRouteId) : stops;
                  const displayStops = availableStops.length > 0 ? availableStops : stops;
                  return (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>📍 Choose Assigned Boarding Stop</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {displayStops.length} stops available
                        </span>
                      </label>
                      <select
                        value={cBoardingStopId}
                        onChange={(e) => setCBoardingStopId(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="">-- Select Boarding Stop --</option>
                        {displayStops.map((s, idx) => (
                          <option key={s.id} value={s.id}>
                            Stop #{s.stop_order || idx + 1}: {s.stop_name} {s.estimated_arrival ? `(Pickup: ${s.estimated_arrival})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCommuterModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  {editingCommuter ? 'Save Changes' : 'Register Staff Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Staff Commuters Bulk CSV Import Modal */}
      {isCommuterCSVModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Bulk Faculty CSV Import</h2>
            <p className="text-xs text-slate-400 mt-2">
              Upload a standard `.csv` file containing employee_id, name, email, department, designation, and bus_id.
            </p>

            <div className="my-6 p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 hover:border-indigo-500 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <div className="text-xs text-slate-300 font-semibold">Click to select CSV File</div>
              <div className="text-[10px] text-slate-500 mt-1">Sample format: EmployeeID, Name, Email, Dept, Designation</div>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsCommuterCSVModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateCommuterCSV}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30"
              >
                Simulate CSV Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Create / Edit Portal Staff Modal */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingPortalStaff ? `Edit Staff: ${editingPortalStaff.name}` : 'Create Portal Staff Login'}
                  </h2>
                  <p className="text-xs text-slate-400">Configure login credentials and select Edit or View-Only permission</p>
                </div>
              </div>
              <button
                onClick={() => setIsPortalModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePortalStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Member Full Name</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
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
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="ganesh.staff@ritrjpm.ac.in"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPPassword ? 'text' : 'password'}
                      required
                      value={pPassword}
                      onChange={(e) => setPPassword(e.target.value)}
                      className="w-full bg-slate-950 text-white text-xs pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPPassword(!showPPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACCESS LEVEL SELECTION: EDIT VS VIEW */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Assign Portal Access Permission Level:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPAccessLevel('edit')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      pAccessLevel === 'edit'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        pAccessLevel === 'edit' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                      }`}>
                        {pAccessLevel === 'edit' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
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
                    onClick={() => setPAccessLevel('view')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      pAccessLevel === 'view'
                        ? 'bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        pAccessLevel === 'view' ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                      }`}>
                        {pAccessLevel === 'view' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
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
                  <select
                    value={pDepartment}
                    onChange={(e) => setPDepartment(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Transport Department">Transport Department</option>
                    {RIT_DEPARTMENTS.map(d => (
                      <option key={d.code} value={`${d.name} (${d.code})`}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={pDesignation}
                    onChange={(e) => setPDesignation(e.target.value)}
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
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono"
                    placeholder="+91 98421 22334"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Account Status</label>
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as any)}
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
                  onClick={() => setIsPortalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  {editingPortalStaff ? 'Save Changes' : 'Create Staff Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Portal Staff Password Modal */}
      {isPortalPasswordModalOpen && targetPortalStaffForPassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Reset Staff Portal Password</h2>
                  <p className="text-xs text-slate-400">{targetPortalStaffForPassword.name} ({targetPortalStaffForPassword.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPortalPasswordModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePortalPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Set New Password</label>
                <div className="relative">
                  <input
                    type={showPortalModalPassword ? 'text' : 'password'}
                    required
                    value={newPortalPasswordValue}
                    onChange={(e) => setNewPortalPasswordValue(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPortalModalPassword(!showPortalModalPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPortalModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  The staff member will use this password alongside their email to log into the web portal.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPortalPasswordModalOpen(false)}
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
