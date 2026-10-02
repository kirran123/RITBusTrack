import React, { useState, useEffect } from 'react';
import { StaffUser, StaffCommuter, Bus, Route, Stop } from '@college-bus/shared';
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
  X,
  ShieldCheck,
  ArrowRight,
  CircleHelp,
} from 'lucide-react';

interface StaffProps {
  currentUser?: any;
  canEdit?: boolean;
  staffList?: StaffUser[];
  staffCommuters?: StaffCommuter[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSaveStaff?: (staff: StaffUser) => void;
  onDeleteStaff?: (staffId: string) => void;
  onToggleStaffAccess?: (staffId: string) => void;
  onUpdateStaffPassword?: (staffId: string, newPass: string) => void;
  onSimulateLoginAsStaff?: (staff: StaffUser) => void;
  onSaveStaffCommuter?: (commuter: StaffCommuter) => void;
  onDeleteStaffCommuter?: (commuterId: string) => void;
  onToggleStaffCommuterLeave?: (commuterId: string) => void;
  onUpdateStaffCommuterPassword?: (commuterId: string, newPass: string) => void;
  onImportStaffCommuterCSV?: (commuters: Partial<StaffCommuter>[]) => void;
}

export const Staff: React.FC<StaffProps> = ({
  staffList = [],
  staffCommuters = [],
  buses = [],
  routes = [],
  stops = [],
  onSaveStaff,
  onDeleteStaff,
  onSaveStaffCommuter,
  onDeleteStaffCommuter,
  onImportStaffCommuterCSV,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Combine staff users and commuters into one unified roster
  const allStaff = [
    ...staffCommuters.map((sc) => ({
      id: sc.id,
      name: sc.profile?.name || sc.name || 'Faculty Member',
      employeeId: sc.employee_id || sc.id,
      dept: sc.department || 'Academic Affairs',
      phone: sc.phone || '+91 98401 11200',
      busId: sc.assigned_bus_id,
      stop: sc.assigned_stop_id || 'Gandhi Statue',
      access: 'View only',
      status: sc.is_on_leave ? 'Inactive' : 'Active',
      isCommuter: true,
    })),
    ...staffList.map((sl) => ({
      id: sl.id,
      name: sl.profile?.name || sl.name || 'Staff Coordinator',
      employeeId: sl.employee_id || sl.id,
      dept: sl.department || 'Administration',
      phone: sl.phone || '+91 98401 11201',
      busId: (sl as any).assigned_bus_id || buses[0]?.id,
      stop: 'Campus Gate',
      access: sl.access_level === 'edit' ? 'Edit access' : sl.status === 'inactive' ? 'Disabled' : 'View only',
      status: sl.status === 'inactive' ? 'Inactive' : 'Active',
      isCommuter: false,
    })),
  ];

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    employeeId: '',
    dept: 'Computer Science',
    phone: '',
    busId: '',
    stop: 'Gandhi Statue',
    access: 'View only',
    status: 'Active',
  });

  const filtered = allStaff.filter((staff) => {
    const bus = buses.find((b) => b.id === staff.busId);
    const busNum = bus ? bus.bus_number || bus.id : '';
    const text = `${staff.name || ''} ${staff.employeeId || ''} ${staff.dept || ''} ${staff.phone || ''} ${busNum} ${staff.stop || ''}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All status' || (staff.status || '').toLowerCase() === statusFilter.toLowerCase();
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
    setEditingStaff(null);
    setFormValues({
      name: '',
      employeeId: `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      dept: 'Computer Science',
      phone: '+91 98401 ' + Math.floor(10000 + Math.random() * 90000),
      busId: buses[0]?.id || '',
      stop: 'Gandhi Statue',
      access: 'View only',
      status: 'Active',
    });
    setModalOpen(true);
  };

  const openEdit = (staff: any) => {
    setEditingStaff(staff);
    setFormValues({
      name: staff.name,
      employeeId: staff.employeeId,
      dept: staff.dept,
      phone: staff.phone,
      busId: staff.busId || '',
      stop: staff.stop,
      access: staff.access,
      status: staff.status,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name.trim()) return;

    if (editingStaff?.isCommuter || !editingStaff) {
      if (onSaveStaffCommuter) {
        onSaveStaffCommuter({
          id: editingStaff ? editingStaff.id : `fac_${Date.now()}`,
          name: formValues.name,
          employee_id: formValues.employeeId,
          department: formValues.dept,
          phone: formValues.phone,
          assigned_bus_id: formValues.busId || undefined,
          assigned_stop_id: formValues.stop,
          is_on_leave: formValues.status === 'Inactive',
          profile: {
            name: formValues.name,
            email: `${formValues.name.toLowerCase().replace(/\s+/g, '.')}@ritrjpm.ac.in`,
          },
        });
      }
    } else {
      if (onSaveStaff) {
        onSaveStaff({
          id: editingStaff.id,
          name: formValues.name,
          employee_id: formValues.employeeId,
          department: formValues.dept,
          phone: formValues.phone,
          access_level: formValues.access === 'Edit access' ? 'edit' : 'view',
          status: formValues.status.toLowerCase() as any,
          role: 'staff',
        });
      }
    }
    setModalOpen(false);
  };

  const handleDelete = (staff: any) => {
    if (window.confirm(`Delete staff member ${staff.name}?`)) {
      if (staff.isCommuter && onDeleteStaffCommuter) {
        onDeleteStaffCommuter(staff.id);
      } else if (onDeleteStaff) {
        onDeleteStaff(staff.id);
      }
    }
  };

  const exportCSV = () => {
    if (!allStaff.length) return;
    const headers = ['Staff Name', 'Employee ID', 'Department', 'Phone', 'Assigned Bus', 'Stop', 'Access'];
    const rows = allStaff.map((s) => {
      const bus = buses.find((b) => b.id === s.busId);
      return [
        `"${s.name}"`,
        `"${s.employeeId}"`,
        `"${s.dept}"`,
        `"${s.phone}"`,
        `"${bus ? bus.bus_number || bus.id : 'Unassigned'}"`,
        `"${s.stop}"`,
        `"${s.access}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportStaffCommuterCSV) return;

    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const parsed: Partial<StaffCommuter>[] = lines.slice(1).map((line) => {
        const parts = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const row: any = {};
        headers.forEach((h, i) => {
          row[h] = parts[i] || '';
        });
        return {
          id: `fac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: row['name'] || row['staff name'] || 'Faculty',
          employee_id: row['employee id'] || row['id'] || `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
          department: row['department'] || row['dept'] || 'Engineering',
          phone: row['phone'] || '+91 98401 11200',
          assigned_stop_id: row['stop'] || 'Gandhi Statue',
          is_on_leave: false,
        };
      });
      onImportStaffCommuterCSV(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'FC';
    return name
      .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s+/i, '')
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'FC';
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> STAFF MANAGEMENT
          </span>
          <h1>
            Staff<span className="headline-period">.</span>
          </h1>
          <p>Manage faculty commuters, route boarding stops, and transport portal permissions.</p>
        </div>
        <div className="section-summary">
          <strong>{allStaff.length}</strong>
          <span>commuter accounts</span>
        </div>
      </div>

      {/* 2. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff..." />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="data-toolbar-right">
          <input type="file" id="staff-csv" accept=".csv,text/csv" className="hidden-file-input" onChange={handleFileUpload} />
          <label htmlFor="staff-csv" className="button button-quiet file-label">
            <Upload size={15} /> Import CSV
          </label>
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export
          </button>
          {isEditable && (
            <button className="button button-primary" onClick={openAdd}>
              <Plus size={16} /> Add staff
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({allStaff.length} total)</small>
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
                <th>Staff member</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Bus</th>
                <th>Stop</th>
                <th>Portal access</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((staff) => {
                const bus = buses.find((b) => b.id === staff.busId);
                const busLabel = bus ? bus.bus_number || bus.id : 'Unassigned';

                return (
                  <tr key={staff.id}>
                    <td>
                      <div className="primary-cell">
                        <span className="primary-cell-icon">
                          <span>{getInitials(staff.name)}</span>
                        </span>
                        <span>
                          <strong>{staff.name}</strong>
                          <small>{staff.employeeId}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="secondary-text font-mono">{staff.employeeId}</span>
                    </td>

                    <td>{staff.dept}</td>

                    <td>{staff.phone}</td>

                    <td>
                      <span className="bus-tag">
                        <BusFront size={12} /> {busLabel}
                      </span>
                    </td>

                    <td>{staff.stop}</td>

                    <td>
                      <span
                        className={`access-label ${
                          staff.access === 'Disabled' ? 'access-disabled' : ''
                        }`}
                      >
                        <i />
                        {staff.access}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditable && (
                          <>
                            <button className="icon-button row-edit" onClick={() => openEdit(staff)} title="Edit staff">
                              <Pencil size={14} />
                            </button>
                            <button className="icon-button row-delete" onClick={() => handleDelete(staff)} title="Delete staff">
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
              <strong>No staff members found</strong>
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
            <button aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((v) => Math.min(pageCount, v + 1))} >
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
        <CircleHelp size={14} /> CSV import supports faculty commuters and administration coordinators.
      </p>

      {/* 5. Add / Edit Staff Modal */}
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
                  <span className="eyebrow-dot" /> STAFF & FACULTY PORTAL
                </span>
                <h2>{editingStaff ? 'Edit staff member' : 'Add staff member'}</h2>
                <p>{editingStaff ? 'Update employee record and system permissions.' : 'Add faculty commuter or portal coordinator.'}</p>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSave}>
              <div className="record-form-grid">
                <label className="span-2">
                  Full name
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                    placeholder="e.g. Dr. Kavitha Rao"
                  />
                </label>

                <label>
                  Employee ID
                  <input
                    type="text"
                    required
                    value={formValues.employeeId}
                    onChange={(e) => setFormValues({ ...formValues, employeeId: e.target.value })}
                    placeholder="FAC-1021"
                  />
                </label>

                <label>
                  Department
                  <select value={formValues.dept} onChange={(e) => setFormValues({ ...formValues, dept: e.target.value })}>
                    <option>Computer Science</option>
                    <option>Administration</option>
                    <option>Biotechnology</option>
                    <option>Mechanical</option>
                    <option>Student Affairs</option>
                    <option>Electronics</option>
                  </select>
                </label>

                <label>
                  Phone number
                  <input
                    type="text"
                    value={formValues.phone}
                    onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                    placeholder="+91 98401 11201"
                  />
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

                <label>
                  Boarding Stop
                  <input
                    type="text"
                    value={formValues.stop}
                    onChange={(e) => setFormValues({ ...formValues, stop: e.target.value })}
                    placeholder="Gandhi Statue"
                  />
                </label>

                <label>
                  Portal Permission
                  <select value={formValues.access} onChange={(e) => setFormValues({ ...formValues, access: e.target.value })}>
                    <option>View only</option>
                    <option>Edit access</option>
                    <option>Disabled</option>
                  </select>
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Changes synchronize with faculty credentials and web administration access.
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingStaff ? 'Save changes' : 'Create staff member'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
