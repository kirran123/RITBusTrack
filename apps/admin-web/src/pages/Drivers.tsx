import React, { useState, useEffect } from 'react';
import { Driver, Bus } from '@college-bus/shared';
import {
  Search,
  Filter,
  Plus,
  Download,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BusFront,
  X,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
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
  drivers = [],
  buses = [],
  onSaveDriver,
  onDeleteDriver,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    phone: '',
    license: '',
    busId: '',
    status: 'Available',
    password: 'driver123',
    employeeId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filtered = drivers.filter((driver) => {
    const name = driver.profile?.name || driver.name || '';
    const empId = driver.employee_id || driver.id || '';
    const phone = driver.phone || '';
    const license = driver.license_number || '';
    const assignedBus = buses.find((b) => b.id === driver.assigned_bus_id);
    const busLabel = assignedBus ? (assignedBus.bus_number || assignedBus.plate_number || assignedBus.id) : '';

    const text = `${name} ${empId} ${phone} ${license} ${busLabel}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());

    const rawStatus = driver.status || 'available';
    const displayStatus =
      rawStatus === 'available' ? 'Available' :
      rawStatus === 'on_duty' ? 'On trip' :
      rawStatus === 'off_duty' ? 'Off duty' : 'Inactive';

    const matchesStatus =
      statusFilter === 'All status' ||
      displayStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize]);

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch {}
  };

  const exportCSV = () => {
    if (!drivers.length) return;
    const headers = ['Driver Name', 'Employee ID', 'Phone', 'License', 'Assigned Bus', 'Status'];
    const rows = drivers.map((d) => {
      const bus = buses.find((b) => b.id === d.assigned_bus_id);
      return [
        `"${d.profile?.name || d.name || ''}"`,
        `"${d.employee_id || d.id || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.license_number || ''}"`,
        `"${bus ? bus.bus_number || bus.id : 'Unassigned'}"`,
        `"${d.status || 'available'}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-drivers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openAdd = () => {
    setEditingDriver(null);
    setFormValues({
      name: '',
      phone: '+91 98400 ' + Math.floor(10000 + Math.random() * 90000),
      license: `TN-67-${new Date().getFullYear()}-${String(drivers.length + 1).padStart(3, '0')}`,
      busId: '',
      status: 'Available',
      password: 'driver123',
      employeeId: `EMP-DRV-${String(drivers.length + 1).padStart(2, '0')}`,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormValues({
      name: driver.profile?.name || driver.name || '',
      phone: driver.phone || '',
      license: driver.license_number || '',
      busId: driver.assigned_bus_id || '',
      status:
        driver.status === 'on_duty' ? 'On trip' :
        driver.status === 'off_duty' ? 'Off duty' :
        driver.status === 'inactive' ? 'Inactive' : 'Available',
      password: driver.password || 'driver123',
      employeeId: driver.employee_id || driver.id || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    const displayName = driver.profile?.name || driver.name || driver.id;
    if (window.confirm(`Delete driver ${displayName}?`)) {
      onDeleteDriver(driver.id);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name.trim()) {
      setFormErrors({ name: 'Driver full name is required' });
      return;
    }

    const rawStatus =
      formValues.status === 'On trip' ? 'on_duty' :
      formValues.status === 'Off duty' ? 'off_duty' :
      formValues.status === 'Inactive' ? 'inactive' : 'available';

    const driverObj: Driver = {
      id: editingDriver ? editingDriver.id : `drv_${Date.now()}`,
      employee_id: formValues.employeeId || `EMP-DRV-${String(drivers.length + 1).padStart(2, '0')}`,
      phone: formValues.phone,
      license_number: formValues.license,
      assigned_bus_id: formValues.busId || undefined,
      status: rawStatus as any,
      password: formValues.password || 'driver123',
      profile: {
        name: formValues.name,
        email: editingDriver?.profile?.email || `${formValues.name.toLowerCase().replace(/\s+/g, '.')}@ritrjpm.ac.in`,
      },
    };

    onSaveDriver(driverObj);
    setModalOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'DR';
    return name
      .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, '')
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DR';
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> DRIVERS MANAGEMENT
          </span>
          <h1>
            Drivers<span className="headline-period">.</span>
          </h1>
          <p>Manage driver records, contact details, and route duty assignments.</p>
        </div>
        <div className="section-summary">
          <strong>{drivers.length}</strong>
          <span>driver records</span>
        </div>
      </div>

      {/* 2. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drivers..."
            />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All status</option>
              <option>Available</option>
              <option>On trip</option>
              <option>Off duty</option>
              <option>Inactive</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="data-toolbar-right">
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export
          </button>
          {isEditable && (
            <button className="button button-primary" onClick={openAdd}>
              <Plus size={16} /> Add driver
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({drivers.length} total)</small>
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
                <th>Driver</th>
                <th>Employee ID</th>
                <th>Phone</th>
                <th>License</th>
                <th>Assigned bus</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((driver) => {
                const name = driver.profile?.name || driver.name || 'Unnamed Driver';
                const empId = driver.employee_id || driver.id;
                const assignedBus = buses.find((b) => b.id === driver.assigned_bus_id);
                const busLabel = assignedBus ? (assignedBus.bus_number || assignedBus.id) : 'Unassigned';

                const statusLabel =
                  driver.status === 'on_duty' ? 'On trip' :
                  driver.status === 'off_duty' ? 'Off duty' :
                  driver.status === 'inactive' ? 'Inactive' : 'Available';

                const statusTone =
                  statusLabel === 'Available' ? 'positive' :
                  statusLabel === 'On trip' ? 'warning' : 'muted';

                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="primary-cell">
                        <span className="primary-cell-icon">
                          <span>{getInitials(name)}</span>
                        </span>
                        <span>
                          <strong>{name}</strong>
                          <small>{empId}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="secondary-text font-mono">{empId}</span>
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>{driver.phone || '—'}</span>
                        {driver.phone && (
                          <button
                            type="button"
                            className="inline-icon"
                            title="Copy phone"
                            onClick={() => copyPhone(driver.phone || '')}
                            style={{ cursor: 'pointer' }}
                          >
                            {copiedPhone === driver.phone ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="secondary-text font-mono">
                        {driver.license_number || '—'}
                      </span>
                    </td>

                    <td>
                      <span className="bus-tag">
                        <BusFront size={12} /> {busLabel}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge status-${statusTone}`}>
                        <i />
                        {statusLabel}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditable && (
                          <>
                            <button
                              className="icon-button row-edit"
                              onClick={() => openEdit(driver)}
                              title="Edit driver"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-button row-delete"
                              onClick={() => handleDelete(driver)}
                              title="Delete driver"
                            >
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
              <strong>No driver records found</strong>
              <p>
                {query ? `Nothing matched “${query}”.` : 'No records match the selected status filter.'}
              </p>
              <button
                className="button button-quiet"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('All status');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* 4. Table Footer with Pagination */}
        <div className="table-footer">
          <span>
            {visibleStart}–{visibleEnd} of {filtered.length} records
          </span>
          <div className="pagination">
            <button
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="page-number active">
              {currentPage} / {pageCount}
            </span>
            <button
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setCurrentPage((v) => Math.min(pageCount, v + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <label className="rows-select">
            Rows per page{' '}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={12} aria-hidden="true" />
          </label>
        </div>
      </div>

      {/* 5. Add / Edit Driver Modal */}
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
                  <span className="eyebrow-dot" /> TRANSPORT OPERATIONS
                </span>
                <h2>{editingDriver ? 'Edit driver' : 'Add driver'}</h2>
                <p>
                  {editingDriver
                    ? 'Update the driver information and duty assignment below.'
                    : 'Add a new driver to the college fleet.'}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
              >
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
                    onChange={(e) =>
                      setFormValues({ ...formValues, name: e.target.value })
                    }
                    placeholder="e.g. Mr. B. Moorthi"
                  />
                  {formErrors.name && (
                    <small className="field-error">{formErrors.name}</small>
                  )}
                </label>

                <label>
                  Employee ID
                  <input
                    type="text"
                    required
                    value={formValues.employeeId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, employeeId: e.target.value })
                    }
                    placeholder="EMP-DRV-01"
                  />
                </label>

                <label>
                  Phone number
                  <input
                    type="text"
                    required
                    value={formValues.phone}
                    onChange={(e) =>
                      setFormValues({ ...formValues, phone: e.target.value })
                    }
                    placeholder="+91 98400 21401"
                  />
                </label>

                <label>
                  Driving license
                  <input
                    type="text"
                    value={formValues.license}
                    onChange={(e) =>
                      setFormValues({ ...formValues, license: e.target.value })
                    }
                    placeholder="TN-67-2024-001"
                  />
                </label>

                <label>
                  Assigned bus
                  <select
                    value={formValues.busId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, busId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_number || bus.plate_number || bus.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Availability status
                  <select
                    value={formValues.status}
                    onChange={(e) =>
                      setFormValues({ ...formValues, status: e.target.value })
                    }
                  >
                    <option>Available</option>
                    <option>On trip</option>
                    <option>Off duty</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label>
                  App login password
                  <input
                    type="text"
                    value={formValues.password}
                    onChange={(e) =>
                      setFormValues({ ...formValues, password: e.target.value })
                    }
                    placeholder="driver123"
                  />
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Live changes will synchronize immediately with
                Supabase and mobile driver apps.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingDriver ? 'Save changes' : 'Create driver'}{' '}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
