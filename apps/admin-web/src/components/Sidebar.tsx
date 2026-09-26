import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Bus as BusIcon, 
  Users, 
  GraduationCap, 
  Briefcase,
  Route as RouteIcon, 
  History, 
  Clock,
  AlertTriangle, 
  Bell, 
  BarChart3, 
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import { UserProfile } from '@college-bus/shared';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeEmergenciesCount: number;
  currentUser?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  activeEmergenciesCount,
  currentUser 
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isViewOnly = currentUser?.role === 'staff' && currentUser?.access_level === 'view';

  const mainNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Live Bus Tracking', path: '/live', icon: MapPin, highlight: true },
  ];

  const fleetNav = [
    { label: 'Bus Management', path: '/buses', icon: BusIcon },
    { label: 'Driver Management', path: '/drivers', icon: Users },
    { label: 'Student Management', path: '/students', icon: GraduationCap },
    { label: 'Staff Management', path: '/staff', icon: Briefcase },
    { label: 'Routes & Stops', path: '/routes', icon: RouteIcon },
    { label: 'Trip History', path: '/trips', icon: History },
    { label: 'Time History', path: '/time-history', icon: Clock },
  ];

  const safetyNav = [
    { 
      label: 'Emergency Alerts', 
      path: '/emergency', 
      icon: AlertTriangle, 
      badge: activeEmergenciesCount > 0 ? `${activeEmergenciesCount} ACTIVE` : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Settings', path: '/settings', icon: Settings }] : []),
  ];

  const renderNavGroup = (title: string, items: typeof mainNav) => (
    <div className="space-y-1">
      <div className="px-3 pt-3 pb-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      {items.map((item: any) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose()}
            className={({ isActive }) => `
              flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : item.highlight
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:text-white'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}
            `}
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-blue-500/20 text-blue-300'}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <BusIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-white text-base leading-tight tracking-tight">BusTrack</h1>
              <p className="text-[11px] text-blue-400 font-semibold">Ramco Institute Tech</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3 no-scrollbar">
          {renderNavGroup('Command & Radar', mainNav)}
          {renderNavGroup('Bus Operations', fleetNav)}
          {renderNavGroup('Safety & Intelligence', safetyNav)}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="text-[11px] text-emerald-400 font-bold">
              Realtime GPS Connected
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-[10.5px] font-bold text-slate-300">
              Designed & Developed by <span className="text-blue-400 font-extrabold">Kirran S T</span>
            </p>
            <p className="text-[9.5px] text-slate-500 font-medium leading-tight">
              Dept. of Information Technology
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
