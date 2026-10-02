import React, { useState, useEffect } from 'react';
import { Bus, Driver, Route } from '@college-bus/shared';
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
  UserRound,
  X,
  ShieldCheck,
  ArrowRight,
  ArrowDownUp,
  RotateCcw,
  Check,
  Bell,
} from 'lucide-react';

interface BusesProps {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  onSaveBus: (bus: Bus) => void;
  onDeleteBus: (busId: string) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Buses: React.FC<BusesProps> = ({
  buses = [],
  drivers = [],
  routes = [],
  onSaveBus,
  onDeleteBus,
  onSubstituteDriver,
  onSwapBus,
  onRevertSubstituteDriver,
  onRevertBusSwap,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formValues, setFormValues] = useState({
    busNumber: '',
    plateNumber: '',
    capacity: 52,
    routeId: '',
    driverId: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Temporary Change Modal State
  const [tempModalOpen, setTempModalOpen] = useState(false);
  const [tempType, setTempType] = useState<'Driver substitution' | 'Standby vehicle swap'>('Driver substitution');
  const [tempBusId, setTempBusId] = useState(buses[0]?.id || '');
  const [tempReplacement, setTempReplacement] = useState('');
  const [tempReason, setTempReason] = useState('Operational exception');

  const filtered = buses.filter((bus) => {
    const route = routes.find((r) => r.id === bus.route_id);
    const driver = drivers.find((d) => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
    const busNum = bus.bus_number || bus.id;
    const plate = bus.plate_number || '';
    const routeName = route ? route.name : '';
    const driverName = driver?.profile?.name || driver?.name || '';

    const text = `${busNum} ${plate} ${routeName} ${driverName}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());

    const displayStatus =
      bus.status === 'active' ? 'Active' :
      bus.status === 'delayed' ? 'Delayed' :
      bus.status === 'maintenance' ? 'Maintenance' : 'Inactive';

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

  const exportCSV = () => {
    if (!buses.length) return;
    const headers = ['Bus', 'Plate Number', 'Route', 'Driver', 'Capacity', 'Status'];
    const rows = buses.map((b) => {
      const r = routes.find((route) => route.id === b.route_id);
      const d = drivers.find((drv) => drv.id === b.assigned_driver_id || drv.assigned_bus_id === b.id);
      return [
        `"${b.bus_number || b.id}"`,
        `"${b.plate_number || ''}"`,
        `"${r ? r.name : 'Unassigned'}"`,
        `"${d ? d.profile?.name || d.name : 'Unassigned'}"`,
        b.capacity || 50,
        `"${b.status || 'active'}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-fleet-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openAdd = () => {
    setEditingBus(null);
    setFormValues({
      busNumber: `BUS-${String(buses.length + 1).padStart(2, '0')}`,
      plateNumber: `TN 67 AM ${Math.floor(1000 + Math.random() * 9000)}`,
      capacity: 52,
      routeId: routes[0]?.id || '',
      driverId: '',
      status: 'Active',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormValues({
      busNumber: bus.bus_number || bus.id,
      plateNumber: bus.plate_number || '',
      capacity: bus.capacity || 52,
      routeId: bus.route_id || '',
      driverId: bus.assigned_driver_id || '',
      status:
        bus.status === 'delayed' ? 'Delayed' :
        bus.status === 'maintenance' ? 'Maintenance' :
        bus.status === 'inactive' ? 'Inactive' : 'Active',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.busNumber.trim()) {
      setFormErrors({ busNumber: 'Bus number is required' });
      return;
    }

    const busObj: Bus = {
      id: editingBus ? editingBus.id : `bus_${Date.now()}`,
      bus_number: formValues.busNumber,
      plate_number: formValues.plateNumber,
      capacity: Number(formValues.capacity) || 52,
      route_id: formValues.routeId || undefined,
      assigned_driver_id: formValues.driverId || undefined,
      status: (formValues.status.toLowerCase() as any) || 'active',
      is_standby_replacement: editingBus?.is_standby_replacement || false,
      substitute_driver_id: editingBus?.substitute_driver_id || undefined,
    };

    onSaveBus(busObj);
    setModalOpen(false);
  };

  const handleDelete = (bus: Bus) => {
    if (window.confirm(`Delete bus ${bus.bus_number || bus.id}?`)) {
      onDeleteBus(bus.id);
    }
  };

  const applyTemporaryChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempReplacement) return;

    if (tempType === 'Driver substitution' && onSubstituteDriver) {
      onSubstituteDriver(tempBusId, tempReplacement, tempReason);
    } else if (tempType === 'Standby vehicle swap' && onSwapBus) {
      const targetBus = buses.find((b) => b.id === tempBusId);
      if (targetBus?.route_id) {
        onSwapBus(targetBus.route_id, tempReplacement, tempReason);
      }
    }
    setTempModalOpen(false);
  };

  const revertTemporaryChange = (bus: Bus) => {
    if (bus.substitute_driver_id && onRevertSubstituteDriver) {
      onRevertSubstituteDriver(bus.id);
    } else if (bus.is_standby_replacement && bus.route_id && onRevertBusSwap) {
      onRevertBusSwap(bus.route_id);
    }
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> BUSES MANAGEMENT
          </span>
          <h1>
            Buses<span className="headline-period">.</span>
          </h1>
          <p>Manage vehicles, assignments, capacity, and live status availability.</p>
        </div>
        <div className="section-summary">
          <strong>{buses.length}</strong>
          <span>registered vehicles</span>
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
              placeholder="Search buses..."
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
              <option>Active</option>
              <option>Delayed</option>
              <option>Maintenance</option>
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
            <>
              <button
                className="button button-quiet"
                onClick={() => {
                  setTempBusId(buses[0]?.id || '');
                  setTempReplacement('');
                  setTempModalOpen(true);
                }}
              >
                <ArrowDownUp size={15} /> Temporary change
              </button>
              <button className="button button-primary" onClick={openAdd}>
                <Plus size={16} /> Add bus
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({buses.length} total)</small>
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
                <th>Bus</th>
                <th>Registration</th>
                <th>Route</th>
                <th>Assigned driver</th>
                <th>Occupancy</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((bus) => {
                const route = routes.find((r) => r.id === bus.route_id);
                const subDriver = bus.substitute_driver_id
                  ? drivers.find((d) => d.id === bus.substitute_driver_id)
                  : null;
                const regDriver = drivers.find(
                  (d) => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id
                );
                const driver = subDriver || regDriver;

                const busNum = bus.bus_number || bus.id;
                const plate = bus.plate_number || 'TN 67 AM 9785';
                const statusLabel =
                  bus.status === 'delayed' ? 'Delayed' :
                  bus.status === 'maintenance' ? 'Maintenance' :
                  bus.status === 'inactive' ? 'Inactive' : 'Active';

                const statusTone =
                  statusLabel === 'Active' ? 'positive' :
                  statusLabel === 'Delayed' ? 'warning' :
                  statusLabel === 'Maintenance' ? 'warning' : 'muted';

                const capacity = bus.capacity || 52;
                const estimatedPassengers = bus.status === 'active' ? Math.round(capacity * 0.72) : 0;
                const occupancyPct = Math.min(100, Math.round((estimatedPassengers / capacity) * 100));

                const hasTempChange = !!bus.substitute_driver_id || !!bus.is_standby_replacement;

                return (
                  <tr key={bus.id}>
                    <td>
                      <div className="primary-cell">
                        <span className="primary-cell-icon bus-primary">
                          <BusFront size={16} />
                        </span>
                        <span>
                          <strong>{busNum}</strong>
                          <small>{plate}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="secondary-text font-mono">{plate}</span>
                    </td>

                    <td>
                      {route ? (
                        <span className="route-tag">
                          <span className="route-color-dot" />
                          {route.name}
                        </span>
                      ) : (
                        <span className="secondary-text">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <span className="table-name">
                        {driver?.profile?.name || driver?.name || 'Unassigned'}
                        {subDriver && <small style={{ color: 'var(--amber)', marginLeft: '6px' }}>(Sub)</small>}
                      </span>
                    </td>

                    <td>
                      <div className="occupancy-cell">
                        <span>
                          {estimatedPassengers} <small>/ {capacity}</small>
                        </span>
                        <i>
                          <b style={{ width: `${occupancyPct}%` }} />
                        </i>
                      </div>
                    </td>

                    <td>
                      <span className={`status-badge status-${statusTone}`}>
                        <i />
                        {statusLabel}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditable && hasTempChange && (
                          <button
                            className="icon-button row-toggle is-active"
                            onClick={() => revertTemporaryChange(bus)}
                            title="Restore regular assignment"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {isEditable && (
                          <>
                            <button
                              className="icon-button row-edit"
                              onClick={() => openEdit(bus)}
                              title="Edit bus"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-button row-delete"
                              onClick={() => handleDelete(bus)}
                              title="Delete bus"
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
              <strong>No vehicles found</strong>
              <p>
                {query ? `Nothing matched “${query}”.` : 'No buses match the selected status filter.'}
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

        {/* 4. Table Footer */}
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

      {/* 5. Operational Substitution Banner */}
      <div className="substitution-note">
        <span className="note-icon">
          <ArrowDownUp size={15} />
        </span>
        <div>
          <strong>Temporary assignments</strong>
          <span>Swap a standby vehicle or substitute driver without losing the regular duty record.</span>
        </div>
        {isEditable && (
          <button
            className="text-action"
            onClick={() => {
              setTempBusId(buses[0]?.id || '');
              setTempReplacement('');
              setTempModalOpen(true);
            }}
          >
            Manage changes <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* 6. Add / Edit Bus Modal */}
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
                <h2>{editingBus ? 'Edit bus' : 'Add bus'}</h2>
                <p>
                  {editingBus
                    ? 'Update the vehicle registration, route, and driver assignment.'
                    : 'Add a new vehicle to the RIT college transport fleet.'}
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
                <label>
                  Bus Number
                  <input
                    type="text"
                    required
                    value={formValues.busNumber}
                    onChange={(e) =>
                      setFormValues({ ...formValues, busNumber: e.target.value })
                    }
                    placeholder="e.g. BUS-01"
                  />
                  {formErrors.busNumber && (
                    <small className="field-error">{formErrors.busNumber}</small>
                  )}
                </label>

                <label>
                  Registration Number
                  <input
                    type="text"
                    required
                    value={formValues.plateNumber}
                    onChange={(e) =>
                      setFormValues({ ...formValues, plateNumber: e.target.value })
                    }
                    placeholder="TN 67 AM 9785"
                  />
                </label>

                <label>
                  Assigned Route
                  <select
                    value={formValues.routeId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, routeId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Assigned Driver
                  <select
                    value={formValues.driverId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, driverId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.profile?.name || d.name} ({d.employee_id || d.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Passenger Seat Capacity
                  <input
                    type="number"
                    value={formValues.capacity}
                    onChange={(e) =>
                      setFormValues({ ...formValues, capacity: Number(e.target.value) || 50 })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={formValues.status}
                    onChange={(e) =>
                      setFormValues({ ...formValues, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Delayed</option>
                    <option>Maintenance</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Fleet updates are synchronized with live tracking
                and mobile apps immediately.
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
                  {editingBus ? 'Save changes' : 'Create bus'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 7. Temporary Change Modal */}
      {tempModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTempModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> OPERATIONAL EXCEPTION
                </span>
                <h2>Temporary fleet change</h2>
                <p>Keep service moving while recording the operational assignment.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setTempModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <div className="change-type-tabs">
              <button
                className={tempType === 'Driver substitution' ? 'active' : ''}
                onClick={() => {
                  setTempType('Driver substitution');
                  setTempReplacement('');
                }}
              >
                <UserRound size={15} /> Substitute driver
              </button>
              <button
                className={tempType === 'Standby vehicle swap' ? 'active' : ''}
                onClick={() => {
                  setTempType('Standby vehicle swap');
                  setTempReplacement('');
                }}
              >
                <BusFront size={15} /> Swap standby bus
              </button>
            </div>

            <form className="record-form" onSubmit={applyTemporaryChange}>
              <div className="record-form-grid">
                <label>
                  Target vehicle
                  <select
                    value={tempBusId}
                    onChange={(e) => setTempBusId(e.target.value)}
                  >
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_number || bus.plate_number || bus.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {tempType === 'Driver substitution' ? 'Substitute driver' : 'Standby vehicle'}
                  <select
                    value={tempReplacement}
                    onChange={(e) => setTempReplacement(e.target.value)}
                    required
                  >
                    <option value="">Select replacement</option>
                    {tempType === 'Driver substitution'
                      ? drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.profile?.name || d.name} ({d.employee_id || d.id})
                          </option>
                        ))
                      : buses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bus_number || b.id} · {b.plate_number || 'Standby'}
                          </option>
                        ))}
                  </select>
                </label>

                <label className="span-2">
                  Operational reason
                  <textarea
                    rows={3}
                    value={tempReason}
                    onChange={(e) => setTempReason(e.target.value)}
                    placeholder="Add operational notes (e.g. driver medical leave, coolant maintenance)..."
                    required
                  />
                </label>
              </div>

              <div className="modal-note">
                <Bell size={14} /> Live changes will reflect across tracking radar and
                mobile schedules instantly.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setTempModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!tempReplacement || !tempReason.trim()}
                >
                  <Check size={15} /> Apply temporary change
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
