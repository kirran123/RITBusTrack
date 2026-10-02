import React, { useState, useEffect } from 'react';
import { Route, Stop, Bus, Driver } from '@college-bus/shared';
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
  Route as RouteIcon,
  MapPin,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowDownUp,
  SlidersHorizontal,
  Zap,
  CheckCircle2,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';

interface RoutesProps {
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  drivers: Driver[];
  onSaveRoute: (route: Route) => void;
  onDeleteRoute: (routeId: string) => void;
  onSaveStop?: (stop: Stop) => void;
  onDeleteStop?: (stopId: string) => void;
  onReorderStops?: (routeId: string, orderedStopIds: string[]) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Routes: React.FC<RoutesProps> = ({
  routes = [],
  stops = [],
  buses = [],
  drivers = [],
  onSaveRoute,
  onDeleteRoute,
  onSaveStop,
  onDeleteStop,
  onReorderStops,
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
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    startPoint: '',
    endPoint: 'Campus Gate',
    distance: '18.4 km',
    duration: '45 min',
    status: 'Active',
    stopsText: '',
  });

  // RouteBuilder Modal
  const [routeBuilder, setRouteBuilder] = useState<Route | null>(null);
  const [builderStops, setBuilderStops] = useState<string[]>([]);
  const [newStopInput, setNewStopInput] = useState('');
  const [coordsInput, setCoordsInput] = useState('');
  const [savedCoords, setSavedCoords] = useState('');
  const [showCoords, setShowCoords] = useState(false);

  const filtered = routes.filter((route) => {
    const text = `${route.name} ${route.start_point || ''} ${route.end_point || ''} ${route.route_number || ''}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const displayStatus = route.status === 'inactive' ? 'Inactive' : 'Active';
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

  const openRouteBuilder = (route: Route) => {
    const routeStops = stops
      .filter((s) => s.route_id === route.id)
      .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0))
      .map((s) => (s as any).name || s.stop_name || 'Stop');

    const initial = routeStops.length > 0 ? routeStops : [route.start_point || 'Old Bus Stand', 'Gandhi Statue', 'PACR Mill', route.end_point || 'Campus Gate'];
    setBuilderStops(initial);
    setRouteBuilder(route);
    setNewStopInput('');
    setCoordsInput('');
    setSavedCoords('');
    setShowCoords(false);
  };

  const moveStop = (index: number, by: number) => {
    setBuilderStops((prev) => {
      const next = [...prev];
      const target = index + by;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const parseCoordinates = () => {
    const match = coordsInput.match(/(-?\d{1,2}(?:\.\d+)?)\s*[, ]+\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (!match) {
      alert('Please enter valid latitude and longitude (e.g. 9.4532, 77.8012)');
      return;
    }
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    const normalized = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setSavedCoords(normalized);
  };

  const saveBuilderStops = () => {
    if (!routeBuilder) return;
    const updatedRoute: Route = {
      ...routeBuilder,
      start_point: builderStops[0] || routeBuilder.start_point,
      end_point: builderStops[builderStops.length - 1] || routeBuilder.end_point,
    };
    onSaveRoute(updatedRoute);
    setRouteBuilder(null);
  };

  const openAdd = () => {
    setEditingRoute(null);
    setFormValues({
      name: `Route ${routes.length + 1} - Loop`,
      startPoint: 'Old Bus Stand',
      endPoint: 'Campus Gate',
      distance: '20 km',
      duration: '45 min',
      status: 'Active',
      stopsText: 'Old Bus Stand · Gandhi Statue · PACR Mill · Campus Gate',
    });
    setModalOpen(true);
  };

  const openEdit = (route: Route) => {
    setEditingRoute(route);
    const routeStops = stops.filter((s) => s.route_id === route.id).map((s) => s.name);
    setFormValues({
      name: route.name,
      startPoint: route.start_point || 'Terminal',
      endPoint: route.end_point || 'Campus Gate',
      distance: (route as any).distance || '18.4 km',
      duration: (route as any).duration || '45 min',
      status: route.status === 'inactive' ? 'Inactive' : 'Active',
      stopsText: routeStops.join(' · ') || `${route.start_point || 'Start'} · Campus Gate`,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name.trim()) return;

    const routeObj: Route = {
      id: editingRoute ? editingRoute.id : `rte_${Date.now()}`,
      name: formValues.name,
      route_number: editingRoute?.route_number || `RTE-${String(routes.length + 1).padStart(2, '0')}`,
      start_point: formValues.startPoint,
      end_point: formValues.endPoint,
      status: formValues.status.toLowerCase() as any,
    };

    onSaveRoute(routeObj);
    setModalOpen(false);
  };

  const handleDelete = (route: Route) => {
    if (window.confirm(`Delete corridor ${route.name}?`)) {
      onDeleteRoute(route.id);
    }
  };

  const exportCSV = () => {
    if (!routes.length) return;
    const headers = ['Route Name', 'Start Terminal', 'Destination', 'Status'];
    const rows = routes.map((r) => [`"${r.name}"`, `"${r.start_point || ''}"`, `"${r.end_point || ''}"`, `"${r.status || 'active'}"`].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-routes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> ROUTES MANAGEMENT
          </span>
          <h1>
            Routes<span className="headline-period">.</span>
          </h1>
          <p>Configure corridors, stops, schedules, and active vehicle assignments.</p>
        </div>
        <div className="section-summary">
          <strong>{routes.length}</strong>
          <span>configured routes</span>
        </div>
      </div>

      {/* 2. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search routes..." />
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
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export
          </button>
          {isEditable && (
            <button className="button button-primary" onClick={openAdd}>
              <Plus size={16} /> Add route
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({routes.length} total)</small>
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
                <th>Route</th>
                <th>Start terminal</th>
                <th>Destination</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Buses</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((route, i) => {
                const assignedBuses = buses.filter((b) => b.route_id === route.id).length;
                const statusLabel = route.status === 'inactive' ? 'Inactive' : 'Active';
                const statusTone = statusLabel === 'Active' ? 'positive' : 'muted';

                return (
                  <tr key={route.id}>
                    <td>
                      <div className="primary-cell">
                        <span className="primary-cell-icon route-primary">
                          <RouteIcon size={16} />
                        </span>
                        <span>
                          <strong>{route.name}</strong>
                          <small>{route.route_number || `RTE-0${i + 1}`}</small>
                        </span>
                      </div>
                    </td>

                    <td>{route.start_point || 'Old Bus Stand'}</td>
                    <td>{route.end_point || 'Campus Gate'}</td>
                    <td>18.4 km</td>
                    <td>42 min</td>
                    <td>
                      <span className="bus-tag">
                        <RouteIcon size={12} /> {assignedBuses} buses
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
                              className="icon-button row-toggle"
                              onClick={() => openRouteBuilder(route)}
                              title="Manage stops & coordinates"
                            >
                              <RouteIcon size={14} />
                            </button>
                            <button
                              className="icon-button row-edit"
                              onClick={() => openEdit(route)}
                              title="Edit route"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-button row-delete"
                              onClick={() => handleDelete(route)}
                              title="Delete route"
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
              <strong>No routes found</strong>
              <p>{query ? `Nothing matched “${query}”.` : 'No routes match the selected filter.'}</p>
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
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={12} aria-hidden="true" />
          </label>
        </div>
      </div>

      {/* 5. Route Operations Cards */}
      <div className="panel routes-tools">
        <div className="routes-tools-head">
          <div>
            <h2>Route operations</h2>
            <p>Manage stop order, check corridor paths, and refresh schedule estimates.</p>
          </div>
          <span className="route-tools-tag">
            <RouteIcon size={14} /> {routes.filter((r) => r.status !== 'inactive').length} active corridors
          </span>
        </div>

        <div className="route-tools-grid">
          {routes.slice(0, 3).map((route, idx) => (
            <div className="route-tool-card" key={route.id}>
              <div className="route-tool-card-top">
                <span className={`route-icon-chip route-chip-${idx}`}>
                  <RouteIcon size={15} />
                </span>
                <span className="route-mileage">18.4 km</span>
              </div>
              <strong>{route.name}</strong>
              <div className="route-terminal-row">
                <span>{route.start_point || 'Start'}</span>
                <i />
                <span>{route.end_point || 'Campus Gate'}</span>
              </div>
              <div className="route-tool-actions">
                <button onClick={() => openRouteBuilder(route)}>
                  <ArrowDownUp size={13} /> Stops
                </button>
                <button onClick={() => alert(`ETA refreshed for ${route.name}`)}>
                  <Zap size={13} /> Recalculate ETAs
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Route Builder Modal */}
      {routeBuilder && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRouteBuilder(null);
          }}
        >
          <section className="modal modal-wide" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> CORRIDOR SEQUENCE
                </span>
                <h2>Manage stops · {routeBuilder.name}</h2>
                <p>Adjust stop order, direction, and route coordinates.</p>
              </div>
              <button className="icon-button" onClick={() => setRouteBuilder(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <div className="route-builder-summary">
              <span className="route-icon-chip">
                <RouteIcon size={15} />
              </span>
              <div>
                <strong>
                  {routeBuilder.start_point || 'Start'} <ArrowRight size={13} /> {routeBuilder.end_point || 'Campus Gate'}
                </strong>
                <small>{builderStops.length} configured stops · 18.4 km · 42 min</small>
              </div>
              <button className="text-action" onClick={() => setShowCoords(!showCoords)}>
                {savedCoords ? 'Edit' : 'Set'} map coordinates
              </button>
            </div>

            {showCoords && (
              <div className="route-coordinates">
                <label>
                  Coordinates or Google Maps link
                  <input
                    value={coordsInput}
                    onChange={(e) => setCoordsInput(e.target.value)}
                    placeholder="e.g. 9.4532, 77.8012"
                  />
                </label>
                <button type="button" className="button button-quiet" onClick={parseCoordinates}>
                  <MapPin size={14} /> Parse
                </button>
                {savedCoords && (
                  <span className="coordinates-saved">
                    <CheckCircle2 size={13} /> {savedCoords}
                  </span>
                )}
              </div>
            )}

            <div className="stop-sequence">
              <div className="stop-sequence-head">
                <strong>Morning stop sequence</strong>
                <span>Use arrows to reorder stops</span>
              </div>
              {builderStops.map((stop, idx) => (
                <div className="stop-sequence-row" key={`${stop}-${idx}`}>
                  <span className={`stop-order ${idx === 0 ? 'stop-start' : idx === builderStops.length - 1 ? 'stop-end' : ''}`}>
                    {idx + 1}
                  </span>
                  <MapPin size={15} />
                  <span className="stop-name">{stop}</span>
                  <span className="stop-time">
                    {idx === builderStops.length - 1 ? '08:20 AM' : `07:${String(45 + idx * 7).padStart(2, '0')} AM`}
                  </span>
                  <button disabled={idx === 0} onClick={() => moveStop(idx, -1)} title="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button disabled={idx === builderStops.length - 1} onClick={() => moveStop(idx, 1)} title="Move down">
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="stop-remove"
                    onClick={() => setBuilderStops((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remove stop"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="add-stop-row">
              <input
                value={newStopInput}
                onChange={(e) => setNewStopInput(e.target.value)}
                placeholder="Add a stop name (e.g. South Square Junction)"
              />
              <button
                type="button"
                className="button button-quiet"
                onClick={() => {
                  if (newStopInput.trim()) {
                    setBuilderStops((prev) => [...prev, newStopInput.trim()]);
                    setNewStopInput('');
                  }
                }}
              >
                <Plus size={14} /> Add stop
              </button>
            </div>

            <div className="route-builder-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setBuilderStops((prev) => [...prev].reverse())}
              >
                <ArrowDownUp size={14} /> Reverse sequence
              </button>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setBuilderStops((prev) => [...prev].sort((a, b) => a.localeCompare(b)))}
              >
                <SlidersHorizontal size={14} /> Auto-align
              </button>
            </div>

            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setRouteBuilder(null)}>
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={saveBuilderStops}>
                <Check size={14} /> Save route sequence
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 7. Add / Edit Route Modal */}
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
                <h2>{editingRoute ? 'Edit corridor' : 'Add corridor'}</h2>
                <p>Configure corridor terminals and operational schedule.</p>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSave}>
              <div className="record-form-grid">
                <label className="span-2">
                  Corridor name
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                    placeholder="e.g. North Loop Express"
                  />
                </label>

                <label>
                  Start terminal
                  <input
                    type="text"
                    required
                    value={formValues.startPoint}
                    onChange={(e) => setFormValues({ ...formValues, startPoint: e.target.value })}
                    placeholder="Old Bus Stand"
                  />
                </label>

                <label>
                  Destination
                  <input
                    type="text"
                    required
                    value={formValues.endPoint}
                    onChange={(e) => setFormValues({ ...formValues, endPoint: e.target.value })}
                    placeholder="Campus Gate"
                  />
                </label>

                <label>
                  Status
                  <select
                    value={formValues.status}
                    onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Corridor configuration syncs to live maps and driver manifests immediately.
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingRoute ? 'Save changes' : 'Create corridor'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
