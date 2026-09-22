import React, { useState, useMemo } from 'react';
import { SystemNotification, NotificationType, NotificationTargetType, Route, Bus } from '@college-bus/shared';
import { 
  Bell, Send, CheckCircle2, Megaphone, Trash2, CheckCheck, Filter, AlertTriangle, 
  RefreshCw, Bus as BusIcon, Info, Sparkles, Clock, Search 
} from 'lucide-react';

interface NotificationsProps {
  notifications?: SystemNotification[];
  routes?: Route[];
  buses?: Bus[];
  onSendNotification: (notification: SystemNotification) => void;
  onDeleteNotification?: (id: string) => void;
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
  onClearAll,
  onMarkAllRead,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const safeBuses = Array.isArray(buses) ? buses : [];

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('general');
  const [targetType, setTargetType] = useState<NotificationTargetType>('all');
  const [targetId, setTargetId] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | NotificationType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-set targetId when targetType changes
  const handleTargetTypeChange = (newTargetType: NotificationTargetType) => {
    setTargetType(newTargetType);
    if (newTargetType === 'route' && safeRoutes.length > 0) {
      setTargetId(safeRoutes[0].id);
    } else if (newTargetType === 'bus' && safeBuses.length > 0) {
      setTargetId(safeBuses[0].id);
    } else {
      setTargetId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    let finalTargetId = targetId;
    if (targetType === 'route' && !finalTargetId && safeRoutes.length > 0) {
      finalTargetId = safeRoutes[0].id;
    } else if (targetType === 'bus' && !finalTargetId && safeBuses.length > 0) {
      finalTargetId = safeBuses[0].id;
    }

    const newNotif: SystemNotification = {
      id: 'n_' + Date.now(),
      title: title.trim(),
      message: message.trim(),
      type,
      target_type: targetType,
      target_id: finalTargetId || null,
      created_at: new Date().toISOString(),
    };

    onSendNotification(newNotif);
    setTitle('');
    setMessage('');
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3500);
  };

  const filteredNotifications = useMemo(() => {
    return safeNotifications.filter(n => {
      if (!n) return false;
      const matchesFilter = selectedFilter === 'all' || n.type === selectedFilter;
      const matchesSearch = searchQuery === '' || 
        (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.message && n.message.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [safeNotifications, selectedFilter, searchQuery]);

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const getNotificationBadge = (notifType: string) => {
    switch (notifType) {
      case 'emergency':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          label: 'EMERGENCY',
        };
      case 'delay':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          label: 'BUS DELAY',
        };
      case 'trip':
        return {
          icon: <BusIcon className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: 'TRIP STATUS',
        };
      case 'maintenance':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-purple-400" />,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          label: 'MAINTENANCE',
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          label: 'ANNOUNCEMENT',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <Bell className="w-7 h-7 text-blue-400" />
            <span>Transport Notifications & Broadcasts</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch instant status alerts, trip delays, and campus announcements to students, drivers, and transport staff.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {safeNotifications.length > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-blue-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {isEditable && safeNotifications.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/30 flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Compose Form or Read-Only Notice */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-blue-400" />
            <span>{isEditable ? 'Compose Broadcast' : 'Broadcast System'}</span>
          </h2>

          {isEditable ? (
            <>
              {sentSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Notification broadcasted successfully across the system!</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Broadcast Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Bus 12 Morning Delay - 15 Mins"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Alert Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as NotificationType)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="general">📢 General Announcement</option>
                    <option value="trip">🚌 Trip Status Update</option>
                    <option value="delay">⏳ Bus Delay Notice</option>
                    <option value="emergency">🚨 Emergency Alert</option>
                    <option value="maintenance">🔧 Vehicle Maintenance Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Audience</label>
                  <select
                    value={targetType}
                    onChange={(e) => handleTargetTypeChange(e.target.value as NotificationTargetType)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">🌐 All Students, Drivers & Staff</option>
                    <option value="route">🛣️ Specific Route Passengers</option>
                    <option value="bus">🚌 Specific Bus Passengers</option>
                    <option value="role">👨‍✈️ Drivers Only</option>
                  </select>
                </div>

                {targetType === 'route' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Select Route</label>
                    <select
                      value={targetId || (safeRoutes[0]?.id || '')}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {safeRoutes.length === 0 ? (
                        <option value="">No routes configured</option>
                      ) : (
                        safeRoutes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.route_name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {targetType === 'bus' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Select Bus</label>
                    <select
                      value={targetId || (safeBuses[0]?.id || '')}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {safeBuses.length === 0 ? (
                        <option value="">No buses registered</option>
                      ) : (
                        safeBuses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bus_number} - {b.bus_name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Message Content</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                    placeholder="Type your alert details here (e.g. Bus 12 has started the return evening trip from campus)..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Now</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700 inline-block">
                View-Only Access
              </span>
              <p>
                Broadcasting announcements and alerts is restricted to Transport Administrators and authorized Editors.
              </p>
              <p className="text-slate-500">
                You can review the historical broadcast log and real-time announcements on the right.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Broadcast History Log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar & Search */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({safeNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('trip')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'trip'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Trips
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('delay')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'delay'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Delays
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('emergency')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'emergency'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Emergency
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('maintenance')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedFilter === 'maintenance'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Maintenance
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-slate-950 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* List of Notifications */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">No Notifications Found</h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {searchQuery ? 'No results matched your search query.' : 'Broadcast history is empty. Compose a message on the left to send an alert.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const badge = getNotificationBadge(n.type || 'general');
                const targetText = (n.target_type || 'all').toString().toUpperCase();

                return (
                  <div
                    key={n.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                            TARGET: {targetText}
                          </span>

                          <span className="text-[10px] text-slate-500">
                            {formatNotificationTime(n.created_at)}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-white text-sm">{n.title}</h3>
                      </div>

                      {isEditable && onDeleteNotification && (
                        <button
                          type="button"
                          onClick={() => onDeleteNotification(n.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete notification entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed break-words">{n.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
