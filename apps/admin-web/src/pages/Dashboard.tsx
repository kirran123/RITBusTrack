import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveFleetMap } from '../components/LiveFleetMap';
import {
  Bus as BusType,
  Driver,
  Student,
  Route,
  Stop,
  Trip,
  CurrentBusLocation,
  EmergencyAlert,
} from '@college-bus/shared';
import {
  BusFront,
  Navigation,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  FileDown,
  Plus,
  Send,
  UserPlus,
  Route as RouteIcon,
  Clock,
  Building2,
  MapPin,
  ChevronDown,
} from 'lucide-react';

interface DashboardProps {
  buses: BusType[];
  drivers: Driver[];
  students: Student[];
  routes: Route[];
  stops?: Stop[];
  trips: Trip[];
  locations: CurrentBusLocation[];
  emergencies: EmergencyAlert[];
  onToggleStudentLeave?: (studentId: string) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  buses = [],
  drivers = [],
  students = [],
  routes = [],
  stops = [],
  emergencies = [],
  locations = [],
  currentUser,
}) => {
  const navigate = useNavigate();
  const [range, setRange] = useState('Last 7 days');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  const activeEmergencies = emergencies.filter((e) => (e.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const movingBuses = buses.filter((b) => b.status === 'active' || b.status === 'delayed').length;
  const onTimeBuses = buses.filter((b) => b.status === 'active').length;
  const onTimePct = Math.round((onTimeBuses / Math.max(movingBuses, 1)) * 100);

  const metrics = [
    {
      label: 'Buses on the road',
      value: `${movingBuses}`,
      helper: `of ${buses.length} registered vehicles`,
      trend: '+2 vs. yesterday',
      icon: BusFront,
      tone: 'green',
      link: '/live',
    },
    {
      label: 'Active trips',
      value: `${movingBuses}`,
      helper: 'Morning shift in progress',
      trend: 'Live',
      icon: Navigation,
      tone: 'blue',
      link: '/time-history',
    },
    {
      label: 'On-time performance',
      value: `${onTimePct}%`,
      helper: 'Across configured routes',
      trend: '+4.2% this week',
      icon: TrendingUp,
      tone: 'violet',
      link: '/reports',
    },
    {
      label: 'Open incidents',
      value: `${activeEmergencies}`,
      helper: activeEmergencies > 0 ? 'Requires attention' : 'All systems clear',
      trend: activeEmergencies > 0 ? 'Action needed' : 'All clear',
      icon: AlertTriangle,
      tone: activeEmergencies > 0 ? 'red' : 'amber',
      link: '/emergency',
    },
  ];

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  const rawName = typeof currentUser?.name === 'string' ? currentUser.name : (typeof currentUser?.profile?.name === 'string' ? currentUser.profile.name : '');
  const userName = rawName.trim() ? rawName.trim().split(/\s+/)[0] : 'Alexandra';

  return (
    <>
      {/* 1. Welcome Row */}
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {currentDateStr} <span className="eyebrow-divider">/</span> MORNING SHIFT
          </div>
          <h1>
            <span className="reveal-word">Good morning,</span>{' '}
            <span className="reveal-word reveal-word-late">{userName}</span>
            <span className="headline-period">.</span>
          </h1>
          <p>Here&rsquo;s what&rsquo;s happening across your transport network today.</p>
        </div>
        <div className="welcome-actions">
          <button className="button button-quiet" onClick={() => navigate('/reports')}>
            <FileDown size={15} /> Export report
          </button>
          <button className="button button-primary" onClick={() => navigate('/buses')}>
            <Plus size={16} /> Add a bus
          </button>
        </div>
      </section>

      {/* 2. 4 Metric Cards */}
      <section className="metric-grid">
        {metrics.map(({ label, value, helper, trend, icon: Icon, tone, link }) => (
          <button className={`metric-card metric-${tone}`} key={label} onClick={() => navigate(link)}>
            <div className="metric-top">
              <span>{label}</span>
              <span className="metric-icon">
                <Icon size={17} />
              </span>
            </div>
            <div className="metric-value-row">
              <strong>{value}</strong>
              <span className="metric-trend">{trend}</span>
            </div>
            <div className="metric-bottom">
              <span>{helper}</span>
              <ArrowRight size={14} />
            </div>
          </button>
        ))}
      </section>

      {/* 3. Incident Banner if active */}
      {activeEmergencies > 0 && (
        <button className="incident-banner" onClick={() => navigate('/emergency')}>
          <span className="incident-icon">
            <AlertOctagon size={17} />
          </span>
          <span>
            <strong>
              {activeEmergencies} incident{activeEmergencies > 1 ? 's' : ''} need attention
            </strong>
            <small>Active emergency signals awaiting acknowledge or resolution.</small>
          </span>
          <span className="incident-cta">
            Review incident <ArrowRight size={15} />
          </span>
        </button>
      )}

      {/* 4. Dashboard Main Grid: Fleet Map + Fleet Status Panel */}
      <section className="dashboard-main-grid">
        <div className="panel map-panel dashboard-map-panel">
          <div className="panel-header">
            <div>
              <h2>Live fleet overview</h2>
              <p>A live snapshot of vehicles currently on route</p>
            </div>
            <button className="text-action" onClick={() => navigate('/live')}>
              Open command center <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ height: '360px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            <LiveFleetMap
              locations={locations || []}
              buses={buses || []}
              routes={routes || []}
              stops={stops || []}
              drivers={drivers || []}
              selectedBusId={selectedBusId}
              onSelectBus={(busId) => {
                setSelectedBusId(busId);
                navigate('/live');
              }}
              height="100%"
            />
          </div>
        </div>

        {/* Fleet Status List Panel */}
        <div className="panel fleet-panel">
          <div className="panel-header">
            <div>
              <h2>Fleet status</h2>
              <p>{buses.length} vehicles in your network</p>
            </div>
            <button className="icon-button small-icon" onClick={() => navigate('/buses')} aria-label="View buses">
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="fleet-list">
            {buses.slice(0, 5).map((bus) => {
              const route = routes.find((r) => r.id === bus.route_id);
              const driver = drivers.find((d) => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
              const capacity = bus.capacity || 52;
              const isDelayed = bus.status === 'delayed';
              const passengers = bus.status === 'active' ? Math.round(capacity * 0.75) : 0;
              const occPct = Math.min(100, Math.round((passengers / capacity) * 100));

              return (
                <button className="fleet-row" key={bus.id} onClick={() => navigate('/live')}>
                  <span className={`fleet-bus-icon ${isDelayed ? 'is-delayed' : ''}`}>
                    <BusFront size={16} />
                  </span>
                  <span className="fleet-info">
                    <strong>
                      {bus.bus_number || bus.id}
                      <small>{route ? route.name : 'Unassigned'}</small>
                    </strong>
                    <span className="fleet-driver">{driver?.profile?.name || driver?.name || 'Unassigned'}</span>
                  </span>
                  <span className="fleet-right">
                    <span className={`status-badge status-${isDelayed ? 'warning' : bus.status === 'active' ? 'positive' : 'muted'}`}>
                      <i />
                      {isDelayed ? 'Delayed' : bus.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <small>{bus.status === 'active' ? '34 km/h' : '0 km/h'}</small>
                    <span className="mini-progress">
                      <i style={{ width: `${occPct}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button className="panel-bottom-link" onClick={() => navigate('/buses')}>
            View all vehicles <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* 5. Lower Grid: Service Activity Chart + Recent Activity */}
      <section className="dashboard-lower-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Service activity</h2>
              <p>Trips started over the {range.toLowerCase()}</p>
            </div>
            <label className="period-select">
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                <option>Today</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div className="activity-chart">
            <div className="chart-summary">
              <strong>
                148 <small>trips</small>
              </strong>
              <span className="chart-positive">
                <TrendingUp size={13} /> +12% <small>vs. previous period</small>
              </span>
            </div>
            <svg viewBox="0 0 620 185" preserveAspectRatio="none" aria-label="Trip activity chart">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="32" y1="45" x2="588" y2="45" className="chart-gridline" />
              <line x1="32" y1="95" x2="588" y2="95" className="chart-gridline" />
              <line x1="32" y1="145" x2="588" y2="145" className="chart-gridline" />
              <polygon points="40,145 40,103 128,89 216,98 304,74 392,85 480,59 568,73 568,145" fill="url(#chartFill)" />
              <polyline points="40,103 128,89 216,98 304,74 392,85 480,59 568,73" className="chart-line" />
              {[[40, 103], [128, 89], [216, 98], [304, 74], [392, 85], [480, 59], [568, 73]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="3.5" className="chart-point" />
              ))}
            </svg>
            <div className="chart-days">
              {['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Recent activity</h2>
              <p>Live updates from your transport network</p>
            </div>
            <button className="text-action" onClick={() => navigate('/notifications')}>
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon green">
                <BusFront size={15} />
              </span>
              <div className="activity-copy">
                <strong>Morning service started</strong>
                <span>BUS-01 · North Loop Express</span>
              </div>
              <time>7:12 AM</time>
            </div>

            <div className="activity-item">
              <span className="activity-icon amber">
                <AlertTriangle size={15} />
              </span>
              <div className="activity-copy">
                <strong>Traffic delay reported</strong>
                <span>BUS-03 · South Gate Corridor</span>
              </div>
              <time>8:04 AM</time>
            </div>

            <div className="activity-item">
              <span className="activity-icon blue">
                <UserPlus size={15} />
              </span>
              <div className="activity-copy">
                <strong>New student assignments</strong>
                <span>Student transport roster updated</span>
              </div>
              <time>Yesterday</time>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Quick Actions Row */}
      <section className="quick-actions-row">
        <span className="quick-label">Quick actions</span>
        <button onClick={() => navigate('/notifications')}>
          <Send size={15} /> Send an announcement
        </button>
        <button onClick={() => navigate('/students')}>
          <UserPlus size={15} /> Add student
        </button>
        <button onClick={() => navigate('/routes')}>
          <RouteIcon size={15} /> Manage routes
        </button>
        <button onClick={() => navigate('/time-history')}>
          <Clock size={15} /> Review time logs
        </button>
      </section>
    </>
  );
};
