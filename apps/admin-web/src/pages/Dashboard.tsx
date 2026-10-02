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
  GraduationCap,
  UserX,
  CheckCircle2,
  RefreshCw,
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
  onToggleStudentLeave,
  currentUser,
  canEdit,
}) => {
  const navigate = useNavigate();
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [range, setRange] = useState('Last 7 days');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  const safeStudents = Array.isArray(students) ? students : [];
  const absentStudents = safeStudents.filter((s) => !!s.is_on_leave);
  const presentStudentsCount = Math.max(0, safeStudents.length - absentStudents.length);

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
      label: 'Student commuters',
      value: `${safeStudents.length}`,
      helper: `${presentStudentsCount} Boarding · ${absentStudents.length} on leave`,
      trend: absentStudents.length > 0 ? `${absentStudents.length} Absent` : '100% Present',
      icon: GraduationCap,
      tone: absentStudents.length > 0 ? 'amber' : 'violet',
      link: '/students',
    },
    {
      label: 'Open incidents',
      value: `${activeEmergencies}`,
      helper: activeEmergencies > 0 ? 'Requires attention' : 'All systems clear',
      trend: activeEmergencies > 0 ? 'Action needed' : 'All clear',
      icon: AlertTriangle,
      tone: activeEmergencies > 0 ? 'red' : 'green',
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

      {/* 5. Today's Student Leave Notices (Not Boarding) */}
      <section className="panel" style={{ marginBottom: '13px', overflow: 'hidden' }}>
        <div className="panel-header" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: absentStudents.length > 0 ? 'var(--amber-soft)' : 'var(--green-soft)',
              color: absentStudents.length > 0 ? 'var(--amber)' : 'var(--green)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}>
              <UserX size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 650 }}>
                  Today's Student Leave Notices (Not Boarding)
                </h2>
                <span
                  className={`status-badge ${absentStudents.length > 0 ? 'status-danger' : 'status-positive'}`}
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                >
                  {absentStudents.length} {absentStudents.length === 1 ? 'Absentee' : 'Absentees'} Reported
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                Real-time 1-day absence notices synced directly with Driver Rosters to optimize waypoint stops.
              </p>
            </div>
          </div>

          <button className="text-action" onClick={() => navigate('/students')} style={{ fontSize: '12px' }}>
            <span>Passenger directory</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {absentStudents.length === 0 ? (
          <div style={{
            padding: '32px 20px',
            textAlign: 'center',
            background: 'var(--panel-soft)',
            borderTop: '1px solid var(--border)'
          }}>
            <CheckCircle2 size={28} style={{ color: 'var(--green)', margin: '0 auto 8px', display: 'block' }} />
            <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
              All Registered Students Scheduled to Board
            </strong>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              No absence or leave notices have been filed for today's morning or evening shifts.
            </p>
          </div>
        ) : (
          <div style={{
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
            borderTop: '1px solid var(--border)',
            background: 'var(--panel-soft)'
          }}>
            {absentStudents.map((student) => {
              const busId = student.assigned_bus_id || student.bus_id;
              const bus = buses.find((b) => b.id === busId);
              const busNum = bus ? bus.bus_number || bus.id : (student.leave_info?.bus_number || 'BUS-01');
              const stop = stops.find((s) => s.id === (student.assigned_stop_id || student.boarding_stop_id)) || student.boarding_stop;
              const stopName = stop?.stop_name || (stop as any)?.name || student.leave_info?.stop_name || 'Assigned Stop';
              const studentName = student.name || student.profile?.name || (student as any).full_name || 'Student';
              const rollNum = student.roll_number || student.register_number || (student as any).regNo || '—';
              const initial = studentName.charAt(0).toUpperCase();

              return (
                <div
                  key={student.id}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--amber-soft)',
                        color: 'var(--amber)',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        flexShrink: 0
                      }}>
                        {initial}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>{studentName}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>Reg: {rollNum}</span>
                      </div>
                    </div>
                    <span className="status-badge status-danger" style={{ fontSize: '9px', padding: '1px 6px' }}>
                      ABSENT TODAY
                    </span>
                  </div>

                  <div style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Assigned Bus:</span>
                      <strong style={{ color: 'var(--ink)' }}>{busNum}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                      <span style={{ color: 'var(--muted)' }}>Boarding Stop:</span>
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>📍 {stopName}</span>
                    </div>
                    {(student.leave_reason || student.leave_info?.reason) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                        <span style={{ color: 'var(--muted)' }}>Reason:</span>
                        <span style={{ color: 'var(--muted-2)', fontStyle: 'italic' }}>
                          {student.leave_reason || student.leave_info?.reason}
                        </span>
                      </div>
                    )}
                  </div>

                  {isEditable && onToggleStudentLeave && (
                    <button
                      type="button"
                      className="button button-quiet small-button"
                      style={{ width: '100%', fontSize: '11px', gap: '5px' }}
                      onClick={() => onToggleStudentLeave(student.id)}
                    >
                      <RefreshCw size={12} />
                      <span>Restore Attendance (Boarding)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Lower Grid: Service Activity Chart + Recent Activity */}
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
