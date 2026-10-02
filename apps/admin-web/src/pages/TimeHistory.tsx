import React, { useState, useEffect } from 'react';
import { Bus, Driver, Route, Trip } from '@college-bus/shared';
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BusFront,
  Sun,
  Moon,
  X,
  MapPin,
} from 'lucide-react';

interface TimeHistoryProps {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  trips?: Trip[];
  currentUser?: any;
}

export const TimeHistory: React.FC<TimeHistoryProps> = ({
  buses = [],
  drivers = [],
  routes = [],
  trips = [],
}) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'history'>('trips');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inspectTrip, setInspectTrip] = useState<any | null>(null);

  // Generate populated trip records from real buses and routes
  const mockTrips = buses.map((bus, i) => {
    const route = routes.find((r) => r.id === bus.route_id);
    const driver = drivers.find((d) => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
    return {
      id: `TRP-0930-0${i + 1}`,
      bus: bus.bus_number || bus.id,
      route: route ? route.name : 'North Loop Express',
      driver: driver?.profile?.name || driver?.name || 'Arun Kumar',
      shift: i % 2 === 0 ? 'Morning' : 'Evening',
      start: `07:${String(10 + i * 4).padStart(2, '0')} AM`,
      end: bus.status === 'active' ? 'In progress' : `08:${String(15 + i * 5).padStart(2, '0')} AM`,
      distance: `${(14.2 + i * 2.1).toFixed(1)} km`,
      status: bus.status === 'delayed' ? 'Delayed' : bus.status === 'active' ? 'Active' : 'Completed',
    };
  });

  const historyLogs = [
    { id: 'LOG-2931', date: 'Sep 30, 2026', bus: 'BUS-01', driver: 'Arun Kumar', shift: 'Morning', scheduled: '07:00 AM', actual: '07:12 AM', duration: '42 min', status: 'On time' },
    { id: 'LOG-2930', date: 'Sep 30, 2026', bus: 'BUS-03', driver: 'Sanjay Rao', shift: 'Morning', scheduled: '07:00 AM', actual: '07:16 AM', duration: '—', status: 'Delayed' },
    { id: 'LOG-2929', date: 'Sep 30, 2026', bus: 'BUS-02', driver: 'Priya Nair', shift: 'Morning', scheduled: '07:05 AM', actual: '07:08 AM', duration: '—', status: 'On time' },
    { id: 'LOG-2928', date: 'Sep 29, 2026', bus: 'BUS-05', driver: 'Vikram Singh', shift: 'Evening', scheduled: '04:30 PM', actual: '04:31 PM', duration: '48 min', status: 'Completed' },
    { id: 'LOG-2927', date: 'Sep 29, 2026', bus: 'BUS-04', driver: 'Meera Das', shift: 'Evening', scheduled: '04:20 PM', actual: '04:24 PM', duration: '47 min', status: 'Completed' },
  ];

  const currentDataset = activeTab === 'trips' ? mockTrips : historyLogs;

  const filtered = currentDataset.filter((item: any) => {
    const text = Object.values(item).join(' ').toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All status' || (item.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize, activeTab]);

  const exportCSV = () => {
    const headers = activeTab === 'trips'
      ? ['Trip ID', 'Bus', 'Route', 'Driver', 'Shift', 'Start', 'End', 'Distance', 'Status']
      : ['Log ID', 'Date', 'Bus', 'Driver', 'Shift', 'Scheduled', 'Actual', 'Duration', 'Status'];

    const rows = filtered.map((row: any) =>
      Object.values(row)
        .map((v) => `"${v}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> OPERATIONS LOGS
          </span>
          <h1>
            {activeTab === 'trips' ? 'Trips' : 'Time history'}
            <span className="headline-period">.</span>
          </h1>
          <p>
            {activeTab === 'trips'
              ? 'Review active and completed campus journeys and driver shift logs.'
              : 'Dispatch and vehicle timing records across morning and evening corridors.'}
          </p>
        </div>
        <div className="section-summary">
          <strong>{currentDataset.length}</strong>
          <span>{activeTab === 'trips' ? 'trip records' : 'timing logs'}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="change-type-tabs" style={{ marginBottom: '14px' }}>
        <button
          className={activeTab === 'trips' ? 'active' : ''}
          onClick={() => {
            setActiveTab('trips');
            setQuery('');
            setStatusFilter('All status');
          }}
        >
          Active journeys ({mockTrips.length})
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => {
            setActiveTab('history');
            setQuery('');
            setStatusFilter('All status');
          }}
        >
          Historical dispatch logs ({historyLogs.length})
        </button>
      </div>

      {/* 2. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
            />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All status</option>
              {activeTab === 'trips' ? (
                <>
                  <option>Active</option>
                  <option>Delayed</option>
                  <option>Completed</option>
                </>
              ) : (
                <>
                  <option>On time</option>
                  <option>Delayed</option>
                  <option>Completed</option>
                </>
              )}
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="data-toolbar-right">
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* 3. Table Panel */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{visibleStart}–{visibleEnd}</strong> of {filtered.length} filtered records{' '}
            <small>({currentDataset.length} total)</small>
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
              {activeTab === 'trips' ? (
                <tr>
                  <th>Trip</th>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Shift</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Distance</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th>Log ID</th>
                  <th>Date</th>
                  <th>Bus</th>
                  <th>Driver</th>
                  <th>Shift</th>
                  <th>Scheduled</th>
                  <th>Actual</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'trips'
                ? visibleRows.map((trip: any) => (
                    <tr key={trip.id}>
                      <td>
                        <span className="font-mono font-bold">{trip.id}</span>
                      </td>
                      <td>
                        <span className="bus-tag">
                          <BusFront size={12} /> {trip.bus}
                        </span>
                      </td>
                      <td>
                        <span className="route-tag">
                          <span className="route-color-dot" /> {trip.route}
                        </span>
                      </td>
                      <td>{trip.driver}</td>
                      <td>
                        <span className="shift-tag">
                          {trip.shift === 'Morning' ? <Sun size={12} /> : <Moon size={12} />}
                          {trip.shift}
                        </span>
                      </td>
                      <td>{trip.start}</td>
                      <td>{trip.end}</td>
                      <td>{trip.distance}</td>
                      <td>
                        <span
                          className={`status-badge status-${
                            trip.status === 'Active'
                              ? 'positive'
                              : trip.status === 'Delayed'
                              ? 'warning'
                              : 'muted'
                          }`}
                        >
                          <i /> {trip.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button row-toggle"
                            onClick={() => setInspectTrip(trip)}
                            title="Inspect trip trace"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : visibleRows.map((log: any) => (
                    <tr key={log.id}>
                      <td>
                        <span className="font-mono font-bold">{log.id}</span>
                      </td>
                      <td>{log.date}</td>
                      <td>
                        <span className="bus-tag">
                          <BusFront size={12} /> {log.bus}
                        </span>
                      </td>
                      <td>{log.driver}</td>
                      <td>
                        <span className="shift-tag">
                          {log.shift === 'Morning' ? <Sun size={12} /> : <Moon size={12} />}
                          {log.shift}
                        </span>
                      </td>
                      <td>{log.scheduled}</td>
                      <td>{log.actual}</td>
                      <td>{log.duration}</td>
                      <td>
                        <span
                          className={`status-badge status-${
                            log.status === 'On time'
                              ? 'positive'
                              : log.status === 'Delayed'
                              ? 'warning'
                              : 'muted'
                          }`}
                        >
                          <i /> {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="empty-state">
              <span>
                <Search size={19} />
              </span>
              <strong>No records found</strong>
              <p>{query ? `Nothing matched “${query}”.` : 'No logs match the current filter.'}</p>
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

      {/* 5. Trip Inspection Modal */}
      {inspectTrip && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInspectTrip(null);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> JOURNEY INSPECTION
                </span>
                <h2>Trip {inspectTrip.id}</h2>
                <p>
                  {inspectTrip.route} · {inspectTrip.shift} shift
                </p>
              </div>
              <button className="icon-button" onClick={() => setInspectTrip(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <div className="trip-inspect">
              <div className="trip-summary">
                <span className="trip-bus">
                  <BusFront size={20} />
                </span>
                <div>
                  <strong>{inspectTrip.bus}</strong>
                  <small>{inspectTrip.driver}</small>
                </div>
                <span
                  className={`status-badge status-${
                    inspectTrip.status === 'Active'
                      ? 'positive'
                      : inspectTrip.status === 'Delayed'
                      ? 'warning'
                      : 'muted'
                  }`}
                >
                  <i /> {inspectTrip.status}
                </span>
              </div>

              <div className="trip-path">
                <div className="trip-stop">
                  <i className="trip-stop-start" />
                  <div>
                    <small>DEPARTED</small>
                    <strong>Old Bus Stand</strong>
                    <span>{inspectTrip.start}</span>
                  </div>
                </div>

                <div className="trip-path-line" />

                <div className="trip-stop">
                  <i className="trip-stop-current" />
                  <div>
                    <small>{inspectTrip.status === 'Completed' ? 'ARRIVED' : 'NEXT STOP'}</small>
                    <strong>{inspectTrip.status === 'Completed' ? 'Campus Gate' : 'Gandhi Statue'}</strong>
                    <span>{inspectTrip.end}</span>
                  </div>
                </div>
              </div>

              <div className="trip-inspect-stats">
                <div>
                  <small>Distance</small>
                  <strong>{inspectTrip.distance}</strong>
                </div>
                <div>
                  <small>Duration</small>
                  <strong>{inspectTrip.status === 'Completed' ? '42 min' : 'In progress'}</strong>
                </div>
                <div>
                  <small>GPS trace</small>
                  <strong>Live telemetry</strong>
                </div>
              </div>

              <div className="modal-note">
                <MapPin size={14} /> Telemetry route coordinates logged via vehicle GPS transceiver.
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
