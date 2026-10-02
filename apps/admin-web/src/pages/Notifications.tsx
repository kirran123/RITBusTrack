import React, { useState } from 'react';
import { SystemNotification, Route, Bus } from '@college-bus/shared';
import {
  Send,
  Users,
  BellRing,
  MessageSquareText,
  Sparkles,
  Route as RouteIcon,
  BusFront,
  UserRound,
  Plus,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';

interface NotificationsProps {
  notifications: SystemNotification[];
  routes: Route[];
  buses: Bus[];
  onSendNotification: (notification: any) => void;
  onDeleteNotification: (id: string) => void;
  onClearAll?: () => void;
  onMarkAllRead?: () => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications = [],
  routes = [],
  buses = [],
  onSendNotification,
  onDeleteNotification,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    type: 'Announcement',
    target: 'Everyone',
    message: '',
  });

  const userNotifications = notifications.filter((n) => {
    if (!n) return false;
    if (n.id === '90000000-0000-0000-0000-000000000001') return false;
    const title = (n.title || '').trim();
    const msg = (n.message || '').trim();
    if (title.includes('REGISTRY_SNAPSHOT') || title.includes('BUST_TRACK_REGISTRY')) return false;
    if (n.type === 'system_registry' || n.type === 'registry_snapshot' || n.type === 'system_internal') return false;
    if (n.target_type === 'system') return false;
    if (msg.startsWith('{"version"') || msg.includes('BUST_TRACK_REGISTRY') || msg.includes('"students":')) return false;
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.title.trim() || !formValues.message.trim()) return;

    onSendNotification({
      title: formValues.title,
      message: formValues.message,
      type: formValues.type.toLowerCase(),
      target_type: formValues.target === 'Everyone' ? 'all' : formValues.target.toLowerCase(),
    });

    setFormValues({
      title: '',
      type: 'Announcement',
      target: 'Everyone',
      message: '',
    });
    setModalOpen(false);
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> COMMUNITY UPDATES
          </span>
          <h1>
            Notifications<span className="headline-period">.</span>
          </h1>
          <p>Keep passengers, faculty, and drivers informed with timely transport updates.</p>
        </div>
        {isEditable && (
          <button className="button button-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Compose broadcast
          </button>
        )}
      </div>

      {/* 2. Three Metric Summary Cards */}
      <div className="notification-summary-grid">
        <div className="panel notify-summary">
          <span className="summary-icon green">
            <Send size={16} />
          </span>
          <div>
            <small>MESSAGES SENT</small>
            <strong>{userNotifications.length}</strong>
            <span>Broadcasts dispatched</span>
          </div>
        </div>

        <div className="panel notify-summary">
          <span className="summary-icon blue">
            <Users size={16} />
          </span>
          <div>
            <small>REACHABLE RIDERS</small>
            <strong>1,284</strong>
            <span>Students, staff & drivers</span>
          </div>
        </div>

        <div className="panel notify-summary">
          <span className="summary-icon amber">
            <BellRing size={16} />
          </span>
          <div>
            <small>DELIVERY RATE</small>
            <strong>99.2%</strong>
            <span>Live push connection</span>
          </div>
        </div>
      </div>

      {/* 3. Broadcast Hero Card with Animated Orb */}
      <div className="panel broadcast-hero">
        <div className="broadcast-art">
          <span className="broadcast-orb orb-one" />
          <span className="broadcast-orb orb-two" />
          <span className="broadcast-letter">
            <MessageSquareText size={25} />
          </span>
          <span className="broadcast-star">
            <Sparkles size={17} />
          </span>
        </div>

        <div className="broadcast-hero-copy">
          <span className="eyebrow">REACH THE RIGHT RIDERS</span>
          <h2>
            One clear update can
            <br />
            make the ride easier.
          </h2>
          <p>Send a service notice, route corridor change, delay alert, or general campus transit announcement.</p>
          {isEditable && (
            <button className="button button-primary" onClick={() => setModalOpen(true)}>
              Create a broadcast <ArrowRight size={15} />
            </button>
          )}
        </div>

        <div className="broadcast-audiences">
          <small>AVAILABLE AUDIENCES</small>
          <span>
            <Users size={14} /> Everyone
          </span>
          <span>
            <RouteIcon size={14} /> Route passengers
          </span>
          <span>
            <BusFront size={14} /> Bus passengers
          </span>
          <span>
            <UserRound size={14} /> Drivers only
          </span>
        </div>
      </div>

      {/* 4. Notification History Table */}
      <div className="panel notification-history">
        <div className="panel-header" style={{ paddingBottom: '10px' }}>
          <div>
            <h2>Broadcast history</h2>
            <p>Recent announcements, recipient coverage, and delivery status</p>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Message</th>
                <th>Type</th>
                <th>Audience</th>
                <th>Sent</th>
                <th>Status</th>
                <th>Reach</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userNotifications.map((n) => {
                const isEmergency = n.type === 'emergency' || String(n.title).toLowerCase().includes('sos');
                const timeLabel = n.created_at
                  ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now';

                return (
                  <tr key={n.id}>
                    <td>
                      <div className="notification-title-cell">
                        <span className={`notification-type-icon ${isEmergency ? 'red' : ''}`}>
                          <MessageSquareText size={15} />
                        </span>
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.message}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="type-chip">{n.type || 'Announcement'}</span>
                    </td>

                    <td>{n.target_type === 'all' ? 'Everyone' : n.target_type || 'Riders'}</td>

                    <td>{timeLabel}</td>

                    <td>
                      <span className="status-badge status-positive">
                        <i /> Sent
                      </span>
                    </td>

                    <td>
                      <span className="reach-cell">
                        1,284 <small>recipients</small>
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditable && (
                          <button
                            className="icon-button row-delete"
                            onClick={() => onDeleteNotification(n.id)}
                            title="Delete announcement"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {userNotifications.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No announcements sent yet. Click &ldquo;Compose broadcast&rdquo; to send one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Compose Broadcast Modal */}
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
                  <span className="eyebrow-dot" /> DISPATCH BROADCAST
                </span>
                <h2>Compose broadcast</h2>
                <p>Write a clear, useful update for the selected transport audience.</p>
              </div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSend}>
              <div className="record-form-grid">
                <label>
                  Message type
                  <select
                    value={formValues.type}
                    onChange={(e) => setFormValues({ ...formValues, type: e.target.value })}
                  >
                    <option>Announcement</option>
                    <option>Trip update</option>
                    <option>Delay notice</option>
                    <option>Emergency alert</option>
                    <option>Maintenance</option>
                    <option>Route change</option>
                  </select>
                </label>

                <label>
                  Audience
                  <select
                    value={formValues.target}
                    onChange={(e) => setFormValues({ ...formValues, target: e.target.value })}
                  >
                    <option>Everyone</option>
                    <option>Route passengers</option>
                    <option>Bus passengers</option>
                    <option>Drivers only</option>
                  </select>
                </label>

                <label className="span-2">
                  Broadcast title
                  <input
                    required
                    value={formValues.title}
                    onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                    placeholder="e.g. North Loop stop adjustment notice"
                  />
                </label>

                <label className="span-2">
                  Message
                  <textarea
                    required
                    rows={4}
                    value={formValues.message}
                    onChange={(e) => setFormValues({ ...formValues, message: e.target.value })}
                    placeholder="Share key details and what riders or drivers should do next..."
                  />
                </label>
              </div>

              <div className="modal-note">
                <BellRing size={14} /> Broadcast dispatches in real-time across Supabase channels to all mobile passholders.
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!formValues.title.trim() || !formValues.message.trim()}
                >
                  <Send size={14} /> Send broadcast
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
