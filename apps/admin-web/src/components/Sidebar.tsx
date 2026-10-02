import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  BusFront,
  UserRound,
  Route as RouteIcon,
  Users,
  Building2,
  Navigation,
  Clock3,
  Siren,
  Bell,
  Activity,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
} from 'lucide-react';
import { UserProfile } from '@college-bus/shared';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeEmergenciesCount: number;
  currentUser?: UserProfile | null;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeEmergenciesCount,
  currentUser,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;
  const handleToggle = onToggleCollapse || (() => setLocalCollapsed(!localCollapsed));
  const isAdmin = currentUser?.role === 'admin';

  const NAV_GROUPS = [
    {
      title: 'Fleet',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Live tracking', path: '/live', icon: Map, highlight: true },
        { label: 'Buses', path: '/buses', icon: BusFront },
        { label: 'Drivers', path: '/drivers', icon: UserRound },
        { label: 'Routes', path: '/routes', icon: RouteIcon },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Students', path: '/students', icon: Users },
        { label: 'Staff', path: '/staff', icon: Building2 },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Trips', path: '/time-history', icon: Navigation },
        { label: 'Time history', path: '/time-history', icon: Clock3 },
      ],
    },
    {
      title: 'Safety',
      items: [
        {
          label: 'Emergency',
          path: '/emergency',
          icon: Siren,
          alert: activeEmergenciesCount > 0,
          count: activeEmergenciesCount > 0 ? activeEmergenciesCount : undefined,
        },
        { label: 'Notifications', path: '/notifications', icon: Bell },
      ],
    },
    {
      title: 'Insights & system',
      items: [
        { label: 'Reports', path: '/reports', icon: Activity },
        ...(isAdmin ? [{ label: 'Settings', path: '/settings', icon: Settings }] : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="mobile-scrim"
          style={{ display: 'block' }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <span className="brand-mark brand-mark--image">
            <img src="/ritbustrack-logo.png" alt="RITBusTrack Logo" />
          </span>
          {!collapsed && (
            <div>
              <div className="brand-name">
                RIT<span>Bus</span>Track
              </div>
              <div className="brand-caption">TRANSPORT OPS</div>
            </div>
          )}
          {/* Top Minimize Button */}
          <button
            type="button"
            className="icon-button small-icon desktop-collapse-btn"
            onClick={handleToggle}
            title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            style={{ marginLeft: 'auto' }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button
            className="mobile-close icon-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="workspace-select" title={collapsed ? 'RIT Campus' : undefined}>
          <span className="workspace-logo">R</span>
          {!collapsed && (
            <>
              <span className="workspace-name">RIT Campus</span>
              <ChevronDown size={14} className="workspace-chevron" />
            </>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="side-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.title}>
              {!collapsed && <div className="nav-group-title">{group.title}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.label + item.path}
                    to={item.path}
                    onClick={() => onClose()}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && (item as any).count && (
                      <span className="nav-count alert-count">
                        {(item as any).count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {/* Footer info & Developer Credits */}
        <div className="sidebar-bottom">
          <div
            className="help-card"
            style={{ marginBottom: '10px' }}
            title={collapsed ? 'GPS Connected · Live fleet telemetry' : undefined}
          >
            <span className="help-icon">
              <Radio size={15} />
            </span>
            {!collapsed && (
              <div>
                <strong>GPS Connected</strong>
                <span>Live fleet telemetry</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div style={{ padding: '4px 6px', fontSize: '10.5px', color: 'var(--muted)' }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                Kirran S T
              </div>
              <div>Dept. of IT · RIT</div>
            </div>
          )}
        </div>

        {/* Dedicated Bottom Minimize / Collapse Button */}
        <button
          type="button"
          className="collapse-button"
          onClick={handleToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span>Collapse menu</span>}
        </button>
      </aside>
    </>
  );
};
