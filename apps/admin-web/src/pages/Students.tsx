import React, { useState } from 'react';
import { Student, Bus, Route, Stop, UserProfile } from '@college-bus/shared';
import { GraduationCap, Plus, Search, Upload, Edit2, Trash2, X, FileText, Lock } from 'lucide-react';

interface StudentsProps {
  students: Student[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onImportCSV: (newStudents: Student[]) => void;
  onToggleStudentLeave?: (studentId: string) => void;
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
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit !== undefined ? canEdit : (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState(4);
  const [section, setSection] = useState('A');
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [boardingStopId, setBoardingStopId] = useState('');

  const openCreateModal = () => {
    setEditingStudent(null);
    setName('');
    setEmail(`student${students.length + 1}@college.edu`);
    setRegisterNumber(`9536211040${students.length + 10}`);
    setDepartment('Computer Science');
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
    setRegisterNumber(student.register_number);
    setDepartment(student.department);
    setYear(student.year);
    setSection(student.section);
    setRouteId(student.route_id || '');
    setBusId(student.bus_id || '');
    setBoardingStopId(student.boarding_stop_id || '');
    setIsModalOpen(true);
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

  const onLeaveCount = students.filter(s => s.is_on_leave).length;
  const activeCount = students.length - onLeaveCount;

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

    return matchesSearch && matchesLeave;
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
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all"
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

      {/* Search & Leave Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search student by name or reg number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Leave Status Filter Pills */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLeaveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              leaveFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All Students ({students.length})
          </button>
          <button
            onClick={() => setLeaveFilter('on_leave')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 ${
              leaveFilter === 'on_leave'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-rose-400 border-rose-900/40 hover:bg-rose-950/20'
            }`}
          >
            <span>⛔ On Leave Today ({onLeaveCount})</span>
          </button>
          <button
            onClick={() => setLeaveFilter('active')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              leaveFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Travelling ({activeCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Register No.</th>
                <th className="px-6 py-4">Department & Year</th>
                <th className="px-6 py-4">Assigned Bus Number</th>
                <th className="px-6 py-4">Boarding Stop Name</th>
                <th className="px-6 py-4">Today's Attendance / Leave</th>
                <th className="px-6 py-4 text-right">{isEditable ? 'Actions' : 'Access Level'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStudents.map((student) => {
                const bus = buses.find(b => b.id === student.bus_id);
                const stop = stops.find(s => s.id === student.boarding_stop_id) || student.boarding_stop;

                return (
                  <tr key={student.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* Student Name & Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                          {student.profile?.name ? student.profile.name.charAt(0) : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-white text-sm leading-tight truncate">
                            {student.profile?.name || 'Student Name'}
                          </div>
                          <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
                            {student.profile?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Register Number */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-950 text-emerald-400 border border-slate-800">
                        {student.register_number}
                      </span>
                    </td>

                    {/* Department & Year */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-200 leading-snug">
                        {student.department}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Year {student.year} &bull; Section {student.section}
                      </div>
                    </td>

                    {/* Assigned Bus */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {bus?.bus_number || student.leave_info?.bus_number || 'BUS 12'}
                      </span>
                    </td>

                    {/* Boarding Stop */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-sky-300 text-xs font-bold">
                        <span className="shrink-0">📍</span>
                        <span className="leading-snug">{stop?.stop_name || student.leave_info?.stop_name || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Today's Attendance / Leave Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.is_on_leave ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1.5 shadow-sm">
                          <span>⛔</span>
                          <span>ON LEAVE TODAY</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center space-x-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Travelling Regular</span>
                        </span>
                      )}
                    </td>

                    {/* Unified Actions Toolbar */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {isEditable ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          {onToggleStudentLeave && (
                            <button
                              type="button"
                              onClick={() => onToggleStudentLeave(student.id)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center space-x-1 shadow-sm ${
                                student.is_on_leave
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              }`}
                              title={student.is_on_leave ? "Restore attendance status" : "Mark 1-day absence"}
                            >
                              <span>{student.is_on_leave ? '🟢 Restore' : '⛔ Mark Leave'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                            title="Edit Student Pass"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove student pass for "${student.profile?.name}"?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                          Read Only
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
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
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
