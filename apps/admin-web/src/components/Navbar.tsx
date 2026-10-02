import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  BellOff,
  Sun,
  Moon,
  Search,
  ChevronRight,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Radio,
  CheckCheck,
  Trash2,
  X,
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
  onSyncCloud?: () => void;
  isSyncing?: boolean;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
}

const BREADCRUMB_MAP: Record<string, [string, string]> = {
  '/': ['Fleet', 'Dashboard'],
  '/live': ['Fleet', 'Live tracking'],
  '/buses': ['Fleet', 'Buses'],
  '/drivers': ['Fleet', 'Drivers'],
  '/routes': ['Fleet', 'Routes'],
  '/students': ['People', 'Students'],
  '/staff': ['People', 'Staff'],
  '/trips': ['Operations', 'Trips'],
  '/time-history': ['Operations', 'Time history'],
  '/emergency': ['Safety', 'Emergency center'],
  '/notifications': ['Safety', 'Notifications'],
  '/reports': ['Insights & system', 'Reports'],
  '/settings': ['Insights & system', 'Settings'],
};

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
  onSyncCloud,
  isSyncing = false,
  theme = 'dark',
  setTheme,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeUser = user || currentUser;
  const userNotifications = notifications.filter((n) => {
    if (!n) return false;
    const title = (n.title || '').trim();
    const msg = (n.message || '').trim();
    return (
      !title.includes('REGISTRY_SNAPSHOT') &&
      !title.includes('BUST_TRACK_REGISTRY') &&
      !msg.startsWith('{"version"') &&
      !msg.includes('BUST_TRACK_REGISTRY') &&
      !msg.includes('"students":') &&
      n.id !== '90000000-0000-0000-0000-000000000001'
    );
  });
  const unreadCount = userNotifications.filter((n) => !n.read_at && n.is_read !== true).length;
  const [parentName, currentName] = BREADCRUMB_MAP[location.pathname] || ['Fleet', 'Dashboard'];

  // Global `/` key listener to focus search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string' || !name.trim()) return 'SA';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'SA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="topbar">
      {/* Left side: Hamburger menu + Breadcrumbs */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="icon-button mobile-menu"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>{parentName}</span>
          <ChevronRight size={13} />
          <strong>{currentName}</strong>
        </nav>
      </div>

      {/* Right side: Actions */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Global Search Bar */}
        <label className="global-search" htmlFor="global-search">
          <Search size={14} />
          <input
            id="global-search"
            type="search"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd>/</kbd>
        </label>

        {/* Cloud Sync Action */}
        {onSyncCloud && (
          <button
            type="button"
            className="icon-button"
            title="Synchronize registry with mobile cloud"
            onClick={onSyncCloud}
            disabled={isSyncing}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Theme Toggle Button */}
        {setTheme && (
          <button
            type="button"
            className="icon-button theme-button"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}

        {/* Notification Bell & Popover */}
        <div className="popover-anchor" ref={notifRef}>
          <button
            type="button"
            className={`icon-button notification-button ${notifOpen ? 'is-open' : ''}`}
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="notification-dot" />}
          </button>

          {notifOpen && (
            <div className="popover notification-popover">
              <div className="popover-head">
                <strong>Notifications</strong>
                {unreadCount > 0 && onMarkAllNotificationsRead && (
                  <button type="button" onClick={onMarkAllNotificationsRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {userNotifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                    <BellOff size={22} style={{ margin: '0 auto 6px', opacity: 0.6 }} />
                    No notifications
                  </div>
                ) : (
                  userNotifications.slice(0, 5).map((notif) => (
                    <div className="notification-item" key={notif.id}>
                      <span
                        className={`notif-icon ${
                          notif.type === 'emergency' ? 'amber' : 'green'
                        }`}
                      >
                        {notif.type === 'emergency' ? <AlertTriangle size={14} /> : <Radio size={14} />}
                      </span>
                      <div>
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                        <small>{notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                className="popover-link"
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/notifications');
                }}
              >
                View all updates &rarr;
              </button>
            </div>
          )}
        </div>

        {/* User Profile Popover */}
        <div className="popover-anchor" ref={profileRef}>
          <button
            type="button"
            className="profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User profile"
          >
            <span className="avatar avatar-green">
              {getInitials(activeUser?.name)}
            </span>
          </button>

          {profileOpen && (
            <div className="popover profile-popover">
              <div className="profile-pop-head">
                <span className="avatar avatar-green">
                  {getInitials(activeUser?.name)}
                </span>
                <div>
                  <strong>{activeUser?.name || 'Administrator'}</strong>
                  <small>{activeUser?.email || 'admin@ritrjpm.ac.in'}</small>
                </div>
              </div>

              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenProfile();
                  }}
                >
                  Account Profile
                </button>
              )}

              <button
                type="button"
                className="signout-item"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
