import React, { useState } from 'react';
import { EmergencyAlert } from '@college-bus/shared';
import {
  AlertOctagon,
  Clock3,
  CheckCheck,
  LifeBuoy,
  Phone,
  Filter,
  ChevronDown,
  BusFront,
  UserRound,
  MapPin,
  Check,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface EmergencyProps {
  emergencies: EmergencyAlert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Emergency: React.FC<EmergencyProps> = ({
  emergencies = [],
  onAcknowledge,
  onResolve,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [filter, setFilter] = useState('All incidents');

  const filtered = emergencies.filter((event) => {
    if (filter === 'All incidents') return true;
    const status = (event.status || 'ACTIVE').toUpperCase();
    if (filter === 'Active') return status === 'ACTIVE';
    if (filter === 'Acknowledged') return status === 'ACKNOWLEDGED';
    if (filter === 'Resolved') return status === 'RESOLVED';
    return true;
  });

  const activeCount = emergencies.filter((e) => (e.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const ackCount = emergencies.filter((e) => (e.status || '').toUpperCase() === 'ACKNOWLEDGED').length;
  const resolvedCount = emergencies.filter((e) => (e.status || '').toUpperCase() === 'RESOLVED').length;

  const copyControlPhone = async () => {
    const phone = '+91 44 4567 8900';
    try {
      await navigator.clipboard.writeText(phone);
      alert(`Transport control number copied: ${phone}`);
    } catch {
      alert(`Transport control: ${phone}`);
    }
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro emergency-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot red-dot" /> SAFETY & RESPONSE
          </span>
          <h1>
            Emergency center<span className="headline-period">.</span>
          </h1>
          <p>Coordinate a clear, timely response across your transport network.</p>
        </div>
        <div className="safety-status">
          <ShieldCheck size={17} />
          <span>Safety systems operational</span>
        </div>
      </div>

      {/* 2. Emergency 4-Grid Metrics */}
      <div className="emergency-metrics">
        <div className="emergency-metric metric-critical">
          <span className="emergency-metric-icon">
            <AlertOctagon size={17} />
          </span>
          <div>
            <small>ACTIVE INCIDENTS</small>
            <strong>{activeCount}</strong>
            <span>{activeCount > 0 ? 'Requires immediate action' : 'All systems clear'}</span>
          </div>
        </div>

        <div className="emergency-metric">
          <span className="emergency-metric-icon amber">
            <Clock3 size={17} />
          </span>
          <div>
            <small>ACKNOWLEDGED</small>
            <strong>{ackCount}</strong>
            <span>Being monitored</span>
          </div>
        </div>

        <div className="emergency-metric">
          <span className="emergency-metric-icon green">
            <CheckCheck size={17} />
          </span>
          <div>
            <small>RESOLVED TODAY</small>
            <strong>{resolvedCount}</strong>
            <span>Added to audit trail</span>
          </div>
        </div>

        <div className="emergency-help">
          <LifeBuoy size={17} />
          <div>
            <strong>Transport control desk</strong>
            <span>Available 24/7 · +91 44 4567 8900</span>
          </div>
          <button
            aria-label="Copy transport control number"
            title="Copy transport control number"
            onClick={copyControlPhone}
          >
            <Phone size={15} />
          </button>
        </div>
      </div>

      {/* 3. Incident Log Header & Filter */}
      <div className="emergency-list-head">
        <div>
          <h2>Incident log</h2>
          <p>All system alerts, driver distress SOS, and mechanical breakdown notices</p>
        </div>
        <label className="select-wrap">
          <Filter size={14} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All incidents</option>
            <option>Active</option>
            <option>Acknowledged</option>
            <option>Resolved</option>
          </select>
          <ChevronDown size={13} />
        </label>
      </div>

      {/* 4. Incident Cards List */}
      <div className="incident-list">
        {filtered.map((event) => {
          const status = (event.status || 'ACTIVE').toUpperCase();
          const isResolved = status === 'RESOLVED';
          const isAck = status === 'ACKNOWLEDGED';
          const isActive = status === 'ACTIVE';

          const timeDisplay = event.created_at
            ? new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '8:04 AM';

          const busLabel = event.bus_id === 'b1' ? 'BUS-01' : (event.bus_id || 'BUS-01');
          const driverLabel = 'Driver Team';

          return (
            <article
              className={`panel incident-card ${
                isResolved
                  ? 'incident-resolved'
                  : isAck
                  ? 'incident-acknowledged'
                  : 'incident-active'
              }`}
              key={event.id}
            >
              <div className="incident-card-marker">
                <AlertOctagon size={18} />
              </div>

              <div className="incident-main">
                <div className="incident-meta">
                  <span className="incident-id">{event.id}</span>
                  <span className="incident-type">{event.type || 'Distress SOS'}</span>
                  <span
                    className={`status-badge status-${
                      isActive ? 'danger' : isAck ? 'warning' : 'positive'
                    }`}
                  >
                    <i />
                    {isActive ? 'Active' : isAck ? 'Acknowledged' : 'Resolved'}
                  </span>
                  <time>{timeDisplay}</time>
                </div>

                <h3>{event.message || 'Distress signal dispatched by vehicle unit.'}</h3>

                <div className="incident-detail-line">
                  <span>
                    <BusFront size={14} /> {busLabel}
                  </span>
                  <span>
                    <UserRound size={14} /> {driverLabel}
                  </span>
                  <span>
                    <MapPin size={14} /> Campus Corridors
                  </span>
                </div>
              </div>

              <div className="incident-actions">
                {isEditable && isActive && (
                  <button
                    className="button button-quiet"
                    onClick={() => onAcknowledge(event.id)}
                  >
                    <Check size={14} /> Acknowledge
                  </button>
                )}
                {isEditable && !isResolved && (
                  <button
                    className="button button-primary"
                    onClick={() => onResolve(event.id)}
                  >
                    <CheckCheck size={14} /> Resolve
                  </button>
                )}
                {isResolved && (
                  <span className="resolved-mark">
                    <CheckCircle2 size={15} /> Closed
                  </span>
                )}
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="panel empty-emergency">
            <CheckCircle2 size={22} />
            <strong>No incidents in this view</strong>
            <span>All transport systems are currently operating normally.</span>
          </div>
        )}
      </div>

      <div className="audit-note">
        <ShieldCheck size={15} />
        <span>
          Incident actions update in real-time across Supabase and browser telemetry audit trails.
        </span>
      </div>
    </>
  );
};
