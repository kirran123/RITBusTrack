import React, { useState } from 'react';
import { Student, Bus, Route, Stop, UserProfile, RIT_DEPARTMENTS, matchesDepartment } from '@college-bus/shared';
import { 
  GraduationCap, Plus, Search, Upload, Edit2, Trash2, X, FileText, Lock,
  Key, Eye, EyeOff, Check, Copy, RefreshCw, ShieldCheck
} from 'lucide-react';

interface StudentsProps {
  students: Student[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onImportCSV: (newStudents: Student[]) => void;
  onToggleStudentLeave?: (studentId: string) => void;
  onUpdateStudentPassword?: (studentId: string, newPass: string) => void;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
}

export const Students: React.FC<StudentsProps> = ({
  students,
  buses,
  routes,
  stops,
  onSaveStudent,
  onDeleteStudent,
  onImportCSV,
  onToggleStudentLeave,
  onUpdateStudentPassword,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit !== undefined ? canEdit : (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Quick Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetStudent, setPasswordTargetStudent] = useState<Student | null>(null);
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [registerNumber, setRegisterNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science and Engineering (CSE)');
  const [year, setYear] = useState(4);
  const [section, setSection] = useState('A');
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [boardingStopId, setBoardingStopId] = useState('');

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'STU-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setName('');
    setEmail(`student${students.length + 1}@ritrjpm.ac.in`);
    setPassword('student123');
    setShowPassword(false);
    setRegisterNumber(`9536211040${students.length + 10}`);
    setDepartment('Computer Science and Engineering (CSE)');
    setYear(4);
    setSection('A');
    setRouteId(routes[0]?.id || '');
    setBusId(buses[0]?.id || '');
    setBoardingStopId(stops[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setName(student.profile?.name || '');
    setEmail(student.profile?.email || '');
    setPassword(student.password || 'student123');
    setShowPassword(false);
    setRegisterNumber(student.register_number);
    setDepartment(student.department);
    setYear(student.year);
    setSection(student.section);
    setRouteId(student.route_id || '');
    setBusId(student.bus_id || '');
    setBoardingStopId(student.boarding_stop_id || '');
    setIsModalOpen(true);
  };

  const openPasswordModal = (student: Student) => {
    setPasswordTargetStudent(student);
    setNewQuickPassword(student.password || 'student123');
    setShowQuickPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleSaveQuickPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetStudent) return;
    const finalPassword = newQuickPassword.trim() || 'student123';
    
    if (onUpdateStudentPassword) {
      onUpdateStudentPassword(passwordTargetStudent.id, finalPassword);
    } else {
      const updated: Student = {
        ...passwordTargetStudent,
        password: finalPassword,
      };
      onSaveStudent(updated);
    }
    setIsPasswordModalOpen(false);
    setPasswordTargetStudent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: Student = {
      id: editingStudent ? editingStudent.id : 's_' + Date.now(),
      user_id: editingStudent ? editingStudent.user_id : 'u_stu_' + Date.now(),
      register_number: registerNumber,
      department,
      year: Number(year),
      section,
      route_id: routeId || null,
      bus_id: busId || null,
      boarding_stop_id: boardingStopId || null,
      password: password || 'student123',
      status: 'active',
      profile: {
        id: editingStudent ? editingStudent.user_id : 'u_stu_' + Date.now(),
        auth_user_id: 'auth_stu_' + Date.now(),
        name,
        email,
        phone: '+91 9988776655',
        role: 'student',
        status: 'active'
      },
      route: routes.find(r => r.id === routeId),
      bus: buses.find(b => b.id === busId),
      boarding_stop: stops.find(s => s.id === boardingStopId)
    };

    onSaveStudent(newStudent);
    setIsModalOpen(false);
  };

  const handleSimulateCSVImport = () => {
    const imported: Student[] = [
      {
        id: 's_csv_1',
        user_id: 'u_csv_1',
        register_number: '953621104101',
        department: 'Electronics & Comm',
        year: 2,
        section: 'A',
        route_id: routes[0]?.id,
        bus_id: buses[0]?.id,
        boarding_stop_id: stops[0]?.id,
        status: 'active',
        profile: { id: 'u_csv_1', auth_user_id: 'auth_c1', name: 'Arun Kumar', email: 'arun@college.edu', phone: '+91 9443322110', role: 'student', status: 'active' }
      },
      {
        id: 's_csv_2',
        user_id: 'u_csv_2',
        register_number: '953621104102',
        department: 'Mechanical Engg',
        year: 3,
        section: 'B',
        route_id: routes[0]?.id,
        bus_id: buses[0]?.id,
        boarding_stop_id: stops[1]?.id,
        status: 'active',
        profile: { id: 'u_csv_2', auth_user_id: 'auth_c2', name: 'Priya Dharshini', email: 'priya@college.edu', phone: '+91 9443322111', role: 'student', status: 'active' }
      }
    ];

    onImportCSV(imported);
    setIsCSVModalOpen(false);
    alert('Successfully imported 2 student records from CSV file!');
  };

  const [leaveFilter, setLeaveFilter] = useState<'all' | 'on_leave' | 'active'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [busFilter, setBusFilter] = useState<string>('all');

  const onLeaveCount = students.filter(s => s.is_on_leave).length;
  const activeCount = students.length - onLeaveCount;

  // 10 Official RIT Departments
  const officialDepartments = RIT_DEPARTMENTS;

  const hasActiveFilters = departmentFilter !== 'all' || yearFilter !== 'all' || busFilter !== 'all' || leaveFilter !== 'all' || searchTerm.trim() !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setLeaveFilter('all');
    setDepartmentFilter('all');
    setYearFilter('all');
    setBusFilter('all');
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      (s.profile?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.register_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLeave =
      leaveFilter === 'all'
        ? true
        : leaveFilter === 'on_leave'
        ? s.is_on_leave
        : !s.is_on_leave;

    const matchesDept = departmentFilter === 'all' || matchesDepartment(s.department, departmentFilter);
    const matchesYear = yearFilter === 'all' || String(s.year) === yearFilter;
    const matchesBus = busFilter === 'all' || s.bus_id === busFilter || (s.bus?.bus_number === busFilter);

    return matchesSearch && matchesLeave && matchesDept && matchesYear && matchesBus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <GraduationCap className="w-7 h-7 text-emerald-500" />
            <span>Student Bus Pass Directory</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student registrations, bus pass allocations, boarding stop assignments & daily leave requests.
          </p>
        </div>

        {isEditable ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCSVModalOpen(true)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Add Student</span>
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sky-400 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>View-Only Mode</span>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH CONTROL SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search student by name, register number, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>

          {/* Leave Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setLeaveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                leaveFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setLeaveFilter('on_leave')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer ${
                leaveFilter === 'on_leave'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                  : 'bg-slate-950 text-rose-400 border-rose-900/40 hover:bg-rose-950/20'
              }`}
            >
              <span>⛔ On Leave ({onLeaveCount})</span>
            </button>
            <button
              onClick={() => setLeaveFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                leaveFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Travelling ({activeCount})
            </button>
          </div>
        </div>

        {/* Multi-Section Dropdown Filters (Department, Year, Bus) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* 1. Department Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏛️ Department</span>
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">All 10 Departments ({students.length})</option>
              {officialDepartments.map(dept => {
                const count = students.filter(s => matchesDepartment(s.department, dept.code)).length;
                return (
                  <option key={dept.code} value={dept.code}>
                    {dept.code} — {dept.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Year of Study Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎓 Year of Study</span>
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">All Academic Years</option>
              <option value="1">1st Year ({students.filter(s => s.year === 1).length})</option>
              <option value="2">2nd Year ({students.filter(s => s.year === 2).length})</option>
              <option value="3">3rd Year ({students.filter(s => s.year === 3).length})</option>
              <option value="4">4th Year ({students.filter(s => s.year === 4).length})</option>
            </select>
          </div>

          {/* 3. Bus Allocation Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚌 Bus Number</span>
            </label>
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">All Allocated Buses ({buses.length})</option>
              {buses.map(b => {
                const count = students.filter(s => s.bus_id === b.id || s.bus?.bus_number === b.bus_number).length;
                return (
                  <option key={b.id} value={b.id}>
                    {b.bus_number} — {b.bus_name} ({count} students)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 4. Active Results & Reset Button */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Showing Results</span>
              <span className="text-emerald-400 font-mono font-bold">{filteredStudents.length} / {students.length}</span>
            </label>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                hasActiveFilters
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

      {/* Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Student</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Reg No.</th>
                <th className="px-3.5 py-3.5">Department</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Bus</th>
                <th className="px-3.5 py-3.5">Boarding Stop</th>
                <th className="px-3.5 py-3.5 text-center whitespace-nowrap">Attendance Status</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">{isEditable ? 'Actions' : 'Access'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.map((student) => {
                const bus = buses.find(b => b.id === student.bus_id);
                const stop = stops.find(s => s.id === student.boarding_stop_id) || student.boarding_stop;

                return (
                  <tr key={student.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* Student Name & Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2.5 min-w-[130px]">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                          {student.profile?.name ? student.profile.name.charAt(0) : 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white text-xs leading-tight truncate">
                            {student.profile?.name || 'Student'}
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-normal truncate">
                            {student.profile?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Register Number */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-950 text-emerald-400 border border-slate-800/80">
                        {student.register_number}
                      </span>
                    </td>

                    {/* Department & Year */}
                    <td className="px-3.5 py-3 max-w-[160px]">
                      <div className="text-xs font-semibold text-slate-200 truncate" title={student.department}>
                        {student.department}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Year {student.year} &bull; Sec {student.section}
                      </div>
                    </td>

                    {/* Assigned Bus */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {bus?.bus_number || student.leave_info?.bus_number || 'BUS-01'}
                      </span>
                    </td>

                    {/* Boarding Stop */}
                    <td className="px-3.5 py-3 max-w-[170px]">
                      <div className="flex items-center space-x-1 text-sky-300 text-xs font-semibold truncate" title={stop?.stop_name || 'N/A'}>
                        <span className="shrink-0 text-[11px]">📍</span>
                        <span className="truncate">{stop?.stop_name || student.leave_info?.stop_name || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Today's Interactive Attendance Status */}
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      {isEditable && onToggleStudentLeave ? (
                        <button
                          type="button"
                          onClick={() => onToggleStudentLeave(student.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm border ${
                            student.is_on_leave
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30'
                          }`}
                          title={student.is_on_leave ? "Click to restore attendance" : "Click to mark 1-day absence"}
                        >
                          {student.is_on_leave ? (
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
                          student.is_on_leave
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {student.is_on_leave ? '⛔ On Leave' : '🟢 Travelling'}
                        </span>
                      )}
                    </td>

                    {/* Actions Toolbar */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditable ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openPasswordModal(student)}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1 transition-colors"
                            title="Set Login Password for Student App"
                          >
                            <Key className="w-3 h-3" />
                            <span className="text-[11px] hidden xl:inline">Password</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Student Pass"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove student pass for "${student.profile?.name}"?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Student"
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

      {/* Quick Password Reset Modal */}
      {isPasswordModalOpen && passwordTargetStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Student App Password</h2>
                  <p className="text-xs text-slate-400">
                    {passwordTargetStudent.profile?.name || passwordTargetStudent.register_number}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPassword} className="space-y-4">
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Student Email / Login ID</span>
                  <span className="text-[11px] font-mono text-emerald-400">{passwordTargetStudent.register_number}</span>
                </div>
                <div className="font-semibold text-white text-xs truncate">
                  {passwordTargetStudent.profile?.email || `student@ritrjpm.ac.in`}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Set New App Password</label>
                  <button
                    type="button"
                    onClick={() => setNewQuickPassword(generateRandomPassword())}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showQuickPassword ? 'text' : 'password'}
                    required
                    value={newQuickPassword}
                    onChange={(e) => setNewQuickPassword(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 pr-20"
                    placeholder="Enter new password"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickPassword(!showQuickPassword)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title={showQuickPassword ? 'Hide password' : 'Show password'}
                    >
                      {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(newQuickPassword, 'quick-pass')}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Copy password"
                    >
                      {copiedKey === 'quick-pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  The student will use this password alongside their institutional email to log into the mobile bus tracking app.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
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

      {/* CSV Import Modal */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Bulk Student CSV Import</h2>
            <p className="text-xs text-slate-400 mt-2">
              Upload a standard `.csv` file containing register_number, name, email, department, year, route_id.
            </p>

            <div className="my-6 p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 hover:border-emerald-500 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <div className="text-xs text-slate-300 font-semibold">Click to select CSV File</div>
              <div className="text-[10px] text-slate-500 mt-1">Sample format: RegisterNo, Name, Email, Dept</div>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsCSVModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateCSVImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30"
              >
                Simulate CSV Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingStudent ? 'Edit Student Pass' : 'Register New Student'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  placeholder="Kavitha S"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="student@ritrjpm.ac.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">App Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 text-white text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 pr-9"
                      placeholder="student123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {officialDepartments.map(d => (
                      <option key={d.code} value={`${d.name} (${d.code})`}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Year of Study</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Bus</label>
                  <select
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800"
                  >
                    <option value="">-- Select Bus --</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.bus_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Boarding Stop</label>
                <select
                  value={boardingStopId}
                  onChange={(e) => setBoardingStopId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800"
                >
                  <option value="">-- Select Boarding Stop --</option>
                  {stops.map(s => (
                    <option key={s.id} value={s.id}>{s.stop_name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
