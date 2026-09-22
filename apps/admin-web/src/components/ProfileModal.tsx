import React from 'react';
import { UserProfile } from '@college-bus/shared';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Activity, 
  Bus as BusIcon, 
  GraduationCap, 
  X, 
  LogOut, 
  Settings, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  busesCount: number;
  studentsCount: number;
  routesCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  busesCount,
  studentsCount,
  routesCount,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Gradient Banner */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-start relative">
          <span className="px-3 py-1 bg-black/30 backdrop-blur-md text-white text-[11px] font-black rounded-full border border-white/20 uppercase tracking-wider">
            Verified Administrator
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Avatar & Primary Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border-4 border-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-xl">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow">
                ✓
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYSTEM ONLINE</span>
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-white">{user.name || 'Transport Administrator'}</h2>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mt-0.5">
              Head of College Transport & Logistics
            </p>
          </div>

          {/* Contact Details Card */}
          <div className="mt-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2 text-slate-400">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Official Email:</span>
              </div>
              <span className="font-mono text-white font-medium">{user.email || 'admin@college.edu'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Emergency Contact:</span>
              </div>
              <span className="font-mono text-white font-medium">{user.phone || '+91 9876543210'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Access Authorization:</span>
              </div>
              <span className="font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px]">
                LEVEL 4 - FULL ACCESS
              </span>
            </div>
          </div>

          {/* System Bus Scope Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-black uppercase">Total Buses</div>
              <div className="text-lg font-black text-white mt-0.5">{busesCount} Buses</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-black uppercase">Active Routes</div>
              <div className="text-lg font-black text-sky-400 mt-0.5">{routesCount} Routes</div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-black uppercase">Students</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{studentsCount} Pass</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition-all border border-slate-700"
            >
              Close Profile
            </button>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="py-3 px-5 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold rounded-2xl transition-all border border-rose-500/30 flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Designed & Developed Credit */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Designed and Developed by <span className="text-blue-400 font-extrabold">Kirran S T</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Department of Information Technology
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
