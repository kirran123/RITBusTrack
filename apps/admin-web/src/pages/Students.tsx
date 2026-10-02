import React, { useState, useEffect } from 'react';
import { Student, Bus, Route, Stop } from '@college-bus/shared';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BusFront,
  CalendarDays,
  X,
  ShieldCheck,
  ArrowRight,
  CircleHelp,
} from 'lucide-react';

interface StudentsProps {
  students: Student[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onImportCSV?: (students: Partial<Student>[]) => void;
  onToggleStudentLeave?: (studentId: string) => void;
  onUpdateStudentPassword?: (studentId: string, newPass: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Students: React.FC<StudentsProps> = ({
  students = [],
  buses = [],
  routes = [],
  stops = [],
  onSaveStudent,
  onDeleteStudent,
  onImportCSV,
  onToggleStudentLeave,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    regNo: '',
    dept: 'Computer Science',
    year: '3rd year',
    busId: '',
    stopName: '',
    isOnLeave: false,
    status: 'Active',
  });

  const filtered = students.filter((student) => {
    const busId = student.assigned_bus_id || student.bus_id;
    const bus = buses.find((b) => b.id === busId);
    const busNum = bus ? bus.bus_number || bus.id : '';
    const stopName = student.assigned_stop_id || student.boarding_stop_id || student.boarding_stop?.stop_name || '';
    const studentName = student.name || student.profile?.name || (student as any).full_name || 'Student';
    const rollNum = student.roll_number || student.register_number || (student as any).regNo || '';
    const text = `${studentName} ${rollNum} ${student.department || ''} ${busNum} ${stopName}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());

    const displayStatus = student.is_on_leave ? 'On leave' : 'Active';
    const matchesStatus = statusFilter === 'All status' || displayStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize]);

  const openAdd = () => {
    setEditingStudent(null);
    setFormValues({
      name: '',
      regNo: `23CSE${Math.floor(1000 + Math.random() * 9000)}`,
      dept: 'Computer Science',
      year: '3rd year',
      busId: buses[0]?.id || '',
      stopName: 'Gandhi Statue',
      isOnLeave: false,
      status: 'Active',
    });
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    const studentName = student.name || student.profile?.name || (student as any).full_name || '';
    const rollNum = student.roll_number || student.register_number || (student as any).regNo || '';
    setEditingStudent(student);
    setFormValues({
      name: studentName,
      regNo: rollNum,
      dept: student.department || 'Computer Science',
      year: student.year ? `${student.year}${typeof student.year === 'number' ? (student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th') + ' year' : ''}` : '3rd year',
      busId: student.assigned_bus_id || student.bus_id || '',
      stopName: student.assigned_stop_id || student.boarding_stop_id || student.boarding_stop?.stop_name || '',
      isOnLeave: !!student.is_on_leave,
      status: student.is_on_leave ? 'On leave' : 'Active',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name.trim()) return;

    const studentObj: Student = {
      id: editingStudent ? editingStudent.id : `stu_${Date.now()}`,
      name: formValues.name,
      roll_number: formValues.regNo,
      department: formValues.dept,
      year: formValues.year as any,
      assigned_bus_id: formValues.busId || undefined,
      assigned_stop_id: formValues.stopName || undefined,
      is_on_leave: formValues.isOnLeave,
      status: (formValues.isOnLeave ? 'inactive' : 'active') as any,
    };

    onSaveStudent(studentObj);
    setModalOpen(false);
  };

  const handleDelete = (student: Student) => {
    const studentName = student.name || student.profile?.name || (student as any).full_name || 'Student';
    if (window.confirm(`Delete student ${studentName}?`)) {
      onDeleteStudent(student.id);
    }
  };

  const toggleLeave = (student: Student) => {
    if (onToggleStudentLeave) {
      onToggleStudentLeave(student.id);
    }
  };

  const exportCSV = () => {
    if (!students.length) return;
    const headers = ['Name', 'Register Number', 'Department', 'Year', 'Assigned Bus', 'Stop', 'Leave Status'];
    const rows = students.map((s) => {
      const busId = s.assigned_bus_id || s.bus_id;
      const bus = buses.find((b) => b.id === busId);
      const studentName = s.name || s.profile?.name || (s as any).full_name || 'Student';
      const rollNum = s.roll_number || s.register_number || (s as any).regNo || '';
      const stopName = s.assigned_stop_id || s.boarding_stop_id || s.boarding_stop?.stop_name || 'Unassigned';
      return [
        `"${studentName}"`,
        `"${rollNum}"`,
        `"${s.department || ''}"`,
        `"${s.year || ''}"`,
        `"${bus ? bus.bus_number || bus.id : 'Unassigned'}"`,
        `"${stopName}"`,
        `"${s.is_on_leave ? 'On leave' : 'Active'}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportCSV) return;

    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const parsed: Partial<Student>[] = lines.slice(1).map((line) => {
        const parts = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const row: any = {};
        headers.forEach((h, i) => {
          row[h] = parts[i] || '';
        });
        return {
          id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: row['name'] || row['student name'] || 'Student',
          roll_number: row['register number'] || row['regno'] || row['roll_number'] || '',
          department: row['department'] || row['dept'] || 'Engineering',
          year: row['year'] || '1st year',
          is_on_leave: false,
          status: 'active',
        };
      });
      onImportCSV(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'ST';
    return (
      name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST'
    );
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> STUDENTS MANAGEMENT
          </span>
          <h1>
            Students<span className="headline-period">.</span>
          </h1>
          <p>Manage student transport roster, boarding stop allocations, and attendance leave.</p>
        </div>
        <div className="section-summary">
          <strong>{students.length}</strong>
          <span>registered students</span>
        </div>
      </div>

      {/* 2. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students..." />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All status</option>
              <option>Active</option>
              <option>On leave</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="data-toolbar-right">
          <input type="file" id="student-csv" accept=".csv,text/csv" className="hidden-file-input" onChange={handleFileUpload} />
          <label htmlFor="student-csv" className="button button-quiet file-label">
            <Upload size={15} /> Import CSV
          </label>
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export
          </button>
          {isEditable && (
            <button className="button button-primary" onClick={openAdd}>
              <Plus size={16} /> Add student
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({students.length} total)</small>
          </span>
          {(query || statusFilter !== 'All status') && (
            <button
              className="text-action"
              onClick={() => {
                setQuery('');
                setStatusFilter('All status');
              }}
            >
              Clear filters <X size={13} />
            </button>
          )}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Register no.</th>
                <th>Department</th>
                <th>Year</th>
                <th>Bus</th>
                <th>Boarding stop</th>
                <th>Leave</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((student) => {
                const studentName = student.name || student.profile?.name || (student as any).full_name || 'Student';
                const rollNum = student.roll_number || student.register_number || (student as any).regNo || '—';
                const busId = student.assigned_bus_id || student.bus_id;
                const bus = buses.find((b) => b.id === busId);
                const busLabel = bus ? bus.bus_number || bus.id : 'Unassigned';
                const stopName = student.assigned_stop_id || student.boarding_stop_id || student.boarding_stop?.stop_name || 'Gandhi Statue';
                const onLeave = !!student.is_on_leave;

                return (
                  <tr key={student.id}>
                    <td>
                      <div className="primary-cell">
                        <span className="primary-cell-icon">
                          <span>{getInitials(studentName)}</span>
                        </span>
                        <span>
                          <strong>{studentName}</strong>
                          <small>{rollNum}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="secondary-text font-mono">{rollNum}</span>
                    </td>

                    <td>{student.department || 'Computer Science'}</td>

                    <td>{String(student.year || '3rd year')}</td>

                    <td>
                      <span className="bus-tag">
                        <BusFront size={12} /> {busLabel}
                      </span>
                    </td>

                    <td>{stopName}</td>

                    <td>
                      <span className={`status-badge status-${onLeave ? 'warning' : 'positive'}`}>
                        <i />
                        {onLeave ? 'On leave' : 'Active'}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditable && (
                          <>
                            <button
                              className={`icon-button row-toggle ${onLeave ? 'is-active' : ''}`}
                              onClick={() => toggleLeave(student)}
                              title={onLeave ? 'Cancel leave' : 'Mark on leave'}
                            >
                              <CalendarDays size={14} />
                            </button>
                            <button className="icon-button row-edit" onClick={() => openEdit(student)} title="Edit student">
                              <Pencil size={14} />
                            </button>
                            <button className="icon-button row-delete" onClick={() => handleDelete(student)} title="Delete student">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="empty-state">
              <span>
                <Search size={19} />
              </span>
              <strong>No students found</strong>
              <p>{query ? `Nothing matched “${query}”.` : 'No records match the current filter.'}</p>
            </div>
          )}
        </div>

        {/* 4. Table Footer */}
        <div className="table-footer">
          <span>
            {visibleStart}–{visibleEnd} of {filtered.length} records
          </span>
          <div className="pagination">
            <button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}>
              <ChevronLeft size={14} />
            </button>
            <span className="page-number active">
              {currentPage} / {pageCount}
            </span>
            <button aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((v) => Math.min(pageCount, v + 1))}>
              <ChevronRight size={14} />
            </button>
          </div>

          <label className="rows-select">
            Rows per page{' '}
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={12} aria-hidden="true" />
          </label>
        </div>
      </div>

      <p className="import-note">
        <CircleHelp size={14} /> CSV import supports name, register number, department, year, and stop. Imported rows sync across web and mobile live.
      </p>

      {/* 5. Add / Edit Student Modal */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> STUDENT PASS ROSTER
                </span>
                <h2>{editingStudent ? 'Edit student' : 'Add student'}</h2>
                <p>{editingStudent ? 'Update student allocation and boarding details.' : 'Register a student for college transport.'}</p>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSave}>
              <div className="record-form-grid">
                <label className="span-2">
                  Student full name
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                    placeholder="e.g. Aarav Mehta"
                  />
                </label>

                <label>
                  Register Number
                  <input
                    type="text"
                    required
                    value={formValues.regNo}
                    onChange={(e) => setFormValues({ ...formValues, regNo: e.target.value })}
                    placeholder="23CSE1042"
                  />
                </label>

                <label>
                  Department
                  <select value={formValues.dept} onChange={(e) => setFormValues({ ...formValues, dept: e.target.value })}>
                    <option>Computer Science</option>
                    <option>Electronics</option>
                    <option>Mechanical</option>
                    <option>Civil Engineering</option>
                    <option>Information Tech</option>
                    <option>Electrical</option>
                  </select>
                </label>

                <label>
                  Year
                  <select value={formValues.year} onChange={(e) => setFormValues({ ...formValues, year: e.target.value })}>
                    <option>1st year</option>
                    <option>2nd year</option>
                    <option>3rd year</option>
                    <option>4th year</option>
                  </select>
                </label>

                <label>
                  Assigned Bus
                  <select value={formValues.busId} onChange={(e) => setFormValues({ ...formValues, busId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number || b.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="span-2">
                  Boarding Stop
                  <input
                    type="text"
                    value={formValues.stopName}
                    onChange={(e) => setFormValues({ ...formValues, stopName: e.target.value })}
                    placeholder="Gandhi Statue"
                  />
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Student allocation syncs with conductor tablet and mobile pass QR codes.
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingStudent ? 'Save changes' : 'Create student'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
