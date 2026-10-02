import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveFleetMap } from '../components/LiveFleetMap';
import {
  CurrentBusLocation,
  Route,
  Stop,
  Bus,
  Driver,
  Student,
} from '@college-bus/shared';
import {
  Wifi,
  RotateCcw,
  CalendarDays,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  ArrowDownUp,
  BusFront,
  Building2,
  ArrowRight,
  Phone,
  Check,
  Copy,
  Plus,
  Compass,
} from 'lucide-react';

interface LiveTrackingProps {
  locations: CurrentBusLocation[];
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  drivers: Driver[];
  students: Student[];
  onToggleStudentLeave?: (studentId: string) => void;
  onSaveBus?: (bus: Bus) => void;
  onSaveDriver?: (driver: Driver) => void;
  onSaveStudent?: (student: Student) => void;
  onSaveRoute?: (route: Route) => void;
  onSaveStop?: (stop: Stop) => void;
  onDeleteStop?: (stopId: string) => void;
  onReorderStops?: (routeId: string, orderedStopIds: string[]) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const LiveTracking: React.FC<LiveTrackingProps> = ({
  buses = [],
  drivers = [],
  routes = [],
  stops = [],
  students = [],
  locations = [],
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'Overview' | 'Passengers'>('Overview');
  const [period, setPeriod] = useState('Today');
  const [filterOpen, setFilterOpen] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('All vehicles');
  const [routeFilter, setRouteFilter] = useState('All routes');
  const [autoSync, setAutoSync] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || 'b1');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [zoom, setZoom] = useState(1);

  const routeNames = ['All routes', ...new Set(routes.map((r) => r.name).filter(Boolean))];

  const visibleBuses = buses.filter((bus) => {
    const route = routes.find((r) => r.id === bus.route_id);
    const rName = route ? route.name : '';

    const matchesStatus =
      trackingStatus === 'All vehicles' ||
      (trackingStatus === 'Active' && bus.status === 'active') ||
      (trackingStatus === 'Delayed' && bus.status === 'delayed') ||
      (trackingStatus === 'Maintenance' && bus.status === 'maintenance') ||
      (trackingStatus === 'Inactive' && bus.status === 'inactive');

    const matchesRoute = routeFilter === 'All routes' || rName === routeFilter;

    return matchesStatus && matchesRoute;
  });

  const activeBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const activeRoute = routes.find((r) => r.id === activeBus?.route_id);
  const activeDriver = drivers.find(
    (d) => d.id === activeBus?.assigned_driver_id || d.assigned_bus_id === activeBus?.id
  );
  const activeLoc = locations.find((l) => l.bus_id === activeBus?.id);

  const onRoad = visibleBuses.filter((b) => b.status === 'active' || b.status === 'delayed').length;
  const onTimeCount = visibleBuses.filter((b) => b.status === 'active').length;
  const delayedCount = visibleBuses.filter((b) => b.status === 'delayed').length;

  const copyDriverPhone = async () => {
    const phone = activeDriver?.phone || '+91 98400 21401';
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {}
  };

  const openFullscreen = async () => {
    const panel = document.querySelector('.tracking-map-panel');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panel?.requestFullscreen?.();
    } catch {}
  };

  const points = [[22, 65], [34, 50], [48, 62], [58, 36], [72, 49], [84, 30], [88, 60]];

  return (
    <>
      {/* 1. Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-pills">
          <span className="live-pill">
            <i /> LIVE
          </span>
          <span className="toolbar-muted">
            <Wifi size={14} /> Receiving vehicle GPS telemetry
          </span>
          <span className="sync-time">
            <RotateCcw size={13} /> {period} · Realtime sync
          </span>
        </div>

        <div className="toolbar-controls">
          <label className="button button-quiet tracking-period">
            <CalendarDays size={15} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Tracking time period"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>This week</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <div className="tracking-filter-anchor">
            <button
              type="button"
              className={`button button-quiet ${filterOpen ? 'is-selected' : ''}`}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter size={15} /> Filters{' '}
              {(trackingStatus !== 'All vehicles' || routeFilter !== 'All routes') && (
                <span className="filter-count">•</span>
              )}
            </button>

            {filterOpen && (
              <div className="tracking-filter-popover">
                <strong>Fleet filters</strong>
                <label>
                  Status
                  <select
                    value={trackingStatus}
                    onChange={(e) => setTrackingStatus(e.target.value)}
                  >
                    <option>All vehicles</option>
                    <option>Active</option>
                    <option>Delayed</option>
                    <option>Maintenance</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label>
                  Route corridor
                  <select
                    value={routeFilter}
                    onChange={(e) => setRouteFilter(e.target.value)}
                  >
                    {routeNames.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setTrackingStatus('All vehicles');
                    setRouteFilter('All routes');
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 5 KPI Stats Bar */}
      <div className="tracking-stats">
        <div>
          <small>MONITORED FLEET</small>
          <strong>
            {visibleBuses.length}
            <span> vehicles</span>
          </strong>
        </div>
        <div>
          <small>ON THE ROAD</small>
          <strong className="text-green">
            {onRoad}
            <span> moving</span>
          </strong>
        </div>
        <div>
          <small>ON TIME</small>
          <strong>
            {onTimeCount}
            <span> vehicles</span>
          </strong>
        </div>
        <div>
          <small>NEEDS ATTENTION</small>
          <strong className="text-amber">
            {delayedCount}
            <span> delayed</span>
          </strong>
        </div>
        <button
          type="button"
          className={`tracking-sync ${autoSync ? 'sync-enabled' : ''}`}
          onClick={() => setAutoSync(!autoSync)}
        >
          <span className="sync-indicator" /> Auto sync <strong>{autoSync ? 'ON' : 'OFF'}</strong>
        </button>
      </div>

      {/* 3. Tracking Layout: Map Canvas + Side Panel */}
      <div className="tracking-layout" style={{ alignItems: 'stretch' }}>
        {/* Map Panel */}
        <div
          className="panel tracking-map-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: '700px',
          }}
        >
          <div className="tracking-map-head">
            <div>
              <div className="live-label">
                <span className="eyebrow-dot" /> LIVE FLEET RADAR
              </div>
              <h2>Every route, one view.</h2>
            </div>
            <div className="map-tools">
              <button
                className={`icon-button small-icon ${filterOpen ? 'is-open' : ''}`}
                onClick={() => setFilterOpen(!filterOpen)}
                title="Filters"
              >
                <SlidersHorizontal size={15} />
              </button>
              <button
                className="icon-button small-icon"
                onClick={openFullscreen}
                title="Fullscreen"
              >
                <ArrowDownUp size={15} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '560px', position: 'relative', overflow: 'hidden' }}>
            <LiveFleetMap
              locations={locations || []}
              buses={visibleBuses}
              routes={routes || []}
              stops={stops || []}
              drivers={drivers || []}
              selectedBusId={selectedBusId}
              onSelectBus={(busId) => setSelectedBusId(busId)}
              height="100%"
            />
          </div>
        </div>

        {/* Tracking Side Panel */}
        <aside className="tracking-side">
          <div className="panel tracking-side-panel">
            <div className="tracking-side-tabs">
              <button
                type="button"
                className={tab === 'Overview' ? 'selected' : ''}
                onClick={() => setTab('Overview')}
              >
                Overview
              </button>
              <button
                type="button"
                className={tab === 'Passengers' ? 'selected' : ''}
                onClick={() => setTab('Passengers')}
              >
                Passengers <span>{students.length}</span>
              </button>
            </div>

            {tab === 'Overview' ? (
              <>
                <div className="selected-bus-head">
                  <span
                    className={`selected-bus-icon ${
                      activeBus?.status === 'delayed' ? 'is-delayed' : ''
                    }`}
                  >
                    <BusFront size={19} />
                  </span>
                  <div>
                    <strong>{activeBus?.bus_number || activeBus?.id || 'BUS-01'}</strong>
                    <small>{activeBus?.plate_number || 'TN 67 AM 9785'}</small>
                  </div>
                  <span
                    className={`status-badge status-${
                      activeBus?.status === 'delayed' ? 'warning' : 'positive'
                    }`}
                  >
                    <i />
                    {activeBus?.status === 'delayed' ? 'Delayed' : 'Active'}
                  </span>
                </div>

                <div className="tracking-route-line">
                  <span className="route-node" />
                  <div>
                    <small>ROUTE CORRIDOR</small>
                    <strong>{activeRoute ? activeRoute.name : 'North Loop Express'}</strong>
                  </div>
                  <ArrowRight size={14} />
                  <span className="tracking-campus">
                    <Building2 size={16} />
                  </span>
                </div>

                <div className="tracking-kpis">
                  <div>
                    <small>EST. CAMPUS ETA</small>
                    <strong>08:18 AM</strong>
                    <span>
                      {activeBus?.status === 'delayed' ? 'Traffic delay · +10 min' : 'On schedule'}
                    </span>
                  </div>
                  <div>
                    <small>CURRENT SPEED</small>
                    <strong>
                      {activeLoc?.speed || (activeBus?.status === 'active' ? 34 : 0)}
                      <small> km/h</small>
                    </strong>
                    <span>GPS accuracy ±6m</span>
                  </div>
                </div>

                <div className="tracking-detail-list">
                  <div>
                    <span>Assigned Driver</span>
                    <strong>
                      {activeDriver?.profile?.name || activeDriver?.name || 'Mr. B. Moorthi'}
                      <button
                        type="button"
                        className="inline-icon"
                        title="Copy driver phone"
                        onClick={copyDriverPhone}
                      >
                        {copiedPhone ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </strong>
                  </div>
                  <div>
                    <span>Occupancy</span>
                    <strong>38 / {activeBus?.capacity || 52}</strong>
                  </div>
                  <div>
                    <span>Current Stop</span>
                    <strong>Gandhi Statue Junction</strong>
                  </div>
                  <div>
                    <span>Next Stop</span>
                    <strong>PACR Mill · 4 min</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-primary button-full"
                  onClick={() => navigate('/buses')}
                >
                  Manage this bus <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <div className="manifest-list">
                {students.slice(0, 7).map((student, i) => {
                  const sName = (student as any).name || student.profile?.name || (student as any).full_name || 'Student';
                  const stopName = (student as any).assigned_stop_id || student.boarding_stop_id || student.boarding_stop?.stop_name || 'Gandhi Statue';
                  return (
                    <div className="manifest-row" key={student.id}>
                      <span
                        className={`avatar avatar-${['blue', 'violet', 'green', 'orange'][i % 4]}`}
                      >
                        {sName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{sName}</strong>
                        <small>{stopName}</small>
                      </div>
                      <span
                        className={`status-badge status-${
                          student.is_on_leave ? 'warning' : i < 4 ? 'positive' : 'muted'
                        }`}
                      >
                        <i /> {student.is_on_leave ? 'On leave' : i < 4 ? 'Boarded' : 'Awaiting'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* On-route vehicles list */}
          <div
            className="panel tracked-bus-list"
            style={{
              maxHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div className="panel-header" style={{ padding: '12px 14px 8px' }}>
              <div>
                <h2>On-route vehicles</h2>
                <p>
                  {onRoad} of {visibleBuses.length} reporting
                </p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 8px' }}>
              {visibleBuses.map((bus) => {
                const route = routes.find((r) => r.id === bus.route_id);
                const isSel = bus.id === selectedBusId;
                const isDelayed = bus.status === 'delayed';

                return (
                  <button
                    type="button"
                    key={bus.id}
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`tracking-bus-row ${isSel ? 'selected' : ''}`}
                  >
                    <span className="tiny-bus">
                      <BusFront size={15} />
                    </span>
                    <div>
                      <strong>
                        {bus.bus_number || bus.id}
                        <small>{route ? route.name : 'Corridor'}</small>
                      </strong>
                    </div>
                    <span className="tracking-eta">
                      08:18 AM
                      <small>{bus.status === 'active' ? '34 km/h' : '0 km/h'}</small>
                    </span>
                    <span
                      className={`status-badge status-${
                        isDelayed ? 'warning' : bus.status === 'active' ? 'positive' : 'muted'
                      }`}
                    >
                      {isDelayed ? 'Delayed' : bus.status === 'active' ? 'Active' : 'Parked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};
