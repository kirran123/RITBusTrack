import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Bus as BusIcon, 
  GraduationCap, 
  AlertTriangle, 
  User 
} from 'lucide-react';

interface BottomNavProps {
  activeEmergenciesCount: number;
  onOpenProfile: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeEmergenciesCount,
  onOpenProfile,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 lg:hidden shadow-2xl py-2 px-3">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Dashboard */}
        <NavLink
          to="/"
          className={({ isActive }) => `
            flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-150
            ${isActive ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Overview</span>
        </NavLink>

        {/* Live Tracking */}
        <NavLink
          to="/live"
          className={({ isActive }) => `
            flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-150 relative
            ${isActive ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <div className="relative">
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] tracking-tight">Live GPS</span>
        </NavLink>

        {/* Buses */}
        <NavLink
          to="/buses"
          className={({ isActive }) => `
            flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-150
            ${isActive ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <BusIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Buses</span>
        </NavLink>

        {/* Students & Leaves */}
        <NavLink
          to="/students"
          className={({ isActive }) => `
            flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-150
            ${isActive ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Students</span>
        </NavLink>

        {/* Emergency Alerts */}
        <NavLink
          to="/emergency"
          className={({ isActive }) => `
            flex flex-col items-center py-1 px-2.5 rounded-xl transition-all duration-150 relative
            ${isActive ? 'text-rose-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <div className="relative">
            <AlertTriangle className="w-5 h-5 mb-0.5" />
            {activeEmergenciesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse">
                {activeEmergenciesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">SOS Alert</span>
        </NavLink>

        {/* Profile Button */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition-all duration-150"
        >
          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black text-blue-400 mb-0.5">
            A
          </div>
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};
