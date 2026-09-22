import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  BellOff,
  AlertTriangle,
  LogOut,
  Search,
  User,
  Eye,
  Edit2,
  CheckCheck,
  Trash2,
  X,
  Radio,
  Bus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, SystemNotification } from '@college-bus/shared';

interface NavbarProps {
  onOpenSidebar: () => void;
  user?: UserProfile | null;
  currentUser?: UserProfile | null;
  onLogout: () => void;
  activeEmergenciesCount: number;
  onOpenEmergencies?: () => void;
  onOpenProfile?: () => void;
  notifications?: SystemNotification[];
  onClearNotifications?: () => void;
  onMarkAllNotificationsRead?: () => void;
  onDismissNotification?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSidebar,
  user,
  currentUser,
  onLogout,
  activeEmergenciesCount,
  onOpenEmergencies,
  onOpenProfile,
  notifications = [],
  onClearNotifications,
  onMarkAllNotificationsRead,
  onDismissNotification,
}) => {
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const activeUser = user || currentUser;
  const isAdmin = activeUser?.role === 'admin';
  const isStaff = activeUser?.role === 'staff';
  const isViewOnly = isStaff && activeUser?.access_level === 'view';

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMins = Math.round((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'swap':
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case 'trip':
        return <Bus className="w-4 h-4 text-emerald-400" />;
      default:
        return <Radio className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden md:block w-72">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bus, driver, route..."
              className="w-full bg-slate-950/70 text-slate-200 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-800/90 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 hover:border-slate-700/80 transition-all placeholder:text-slate-500 shadow-inner"
            />
          </div>
        </div>

        {/* Role & Access Tier Indicator in Top Bar */}
        {isViewOnly && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold shadow-sm">
            <Eye className="w-3.5 h-3.5" />
            <span>Admin Staff (View-Only)</span>
          </div>
        )}
        {isStaff && !isViewOnly && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Admin Staff (Edit Access)</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3 lg:space-x-4">
        {/* Emergency Alert Indicator Banner */}
        {activeEmergenciesCount > 0 && (
          <button
            onClick={onOpenEmergencies}
            className="flex items-center space-x-2 px-3 py-1.5 bg-rose-500/15 border border-rose-500/40 text-rose-400 rounded-xl hover:bg-rose-500/25 transition-all shadow-sm shadow-rose-500/10 group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold tracking-wide hidden sm:inline uppercase">
              {activeEmergenciesCount} Emergency Alert{activeEmergenciesCount > 1 ? 's' : ''}
            </span>
          </button>
        )}

        {/* Interactive Notifications Button & Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`relative p-2 rounded-xl transition-all ${
              isNotificationOpen
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Notifications"
            aria-label="Toggle notifications dropdown"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-white">Notifications</span>
                  {unreadCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                      {notifications.length} total
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {unreadCount > 0 && onMarkAllNotificationsRead && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 text-xs flex items-center space-x-1 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">Read All</span>
                    </button>
                  )}

                  {notifications.length > 0 && onClearNotifications && (
                    <button
                      onClick={onClearNotifications}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs flex items-center space-x-1 transition-colors"
                      title="Clear all notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">Clear</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List or Clean Empty State */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {notifications.length === 0 ? (
                  /* Clean Empty Notification State */
                  <div className="py-12 px-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-200">No notifications</p>
                      <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                        You have no new alerts. Real-time bus swaps, driver changes, and dispatch notices will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Notification List Items */
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate('/notifications');
                      }}
                      className={`p-3.5 hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start space-x-3 ${
                        !item.read_at ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                        {getNotificationIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!item.read_at ? 'font-black text-white' : 'font-bold text-slate-300'}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatNotificationTime(item.created_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed break-words line-clamp-2">
                          {item.message}
                        </p>
                      </div>

                      {onDismissNotification && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissNotification(item.id);
                          }}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 shrink-0"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  Live Dispatch Sync
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-[10.5px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All Alerts</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Info & Profile */}
        <div
          onClick={onOpenProfile}
          className="flex items-center space-x-3 pl-2 border-l border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
          title="Open User Profile"
        >
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shadow ${
              isAdmin
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : isViewOnly
                ? 'bg-sky-600/20 border-sky-500/40 text-sky-300'
                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {activeUser?.name ? activeUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">
              {activeUser?.name || 'Super Admin'}
            </div>
            <div className="text-[10px] text-blue-400 uppercase font-black tracking-wider">
              {isAdmin ? '👑 Super Admin' : isViewOnly ? '👁️ Admin Staff (View)' : '✏️ Admin Staff (Edit)'}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
