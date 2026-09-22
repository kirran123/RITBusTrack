import React, { useState } from 'react';
import { Bus, Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile, StaffUser } from '@college-bus/shared';
import { INITIAL_STAFF } from '../services/mockDataStore';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  staffList?: StaffUser[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, staffList = INITIAL_STAFF }) => {
  const [email, setEmail] = useState('kirranvijay@gmail.com');
  const [password, setPassword] = useState('Kirranst@14');
  const [selectedQuickType, setSelectedQuickType] = useState<'super_admin' | 'admin_staff'>('super_admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);

      // 1. Super Admin Authentication
      const isSuperAdminEmail =
        email.toLowerCase() === 'kirranvijay@gmail.com' ||
        email.toLowerCase() === 'admin@college.edu' ||
        email.toLowerCase() === 'admin';
      const isSuperAdminPass = password === 'Kirranst@14' || password === 'admin123';

      if (isSuperAdminEmail) {
        if (!isSuperAdminPass) {
          setError('Invalid Super Admin password. Please check your credentials.');
          return;
        }

        const superAdminProfile: UserProfile = {
          id: 'sa_01',
          auth_user_id: 'auth_super_admin',
          name: 'Super Admin',
          email: 'kirranvijay@gmail.com',
          phone: '+91 9876543210',
          role: 'admin',
          status: 'active',
        };
        onLogin(superAdminProfile);
        return;
      }

      // 2. Unified Admin Staff Authentication (Created by Super Admin with Edit or View permissions)
      const foundStaff = staffList.find((s) => s.email.toLowerCase() === email.toLowerCase());
      if (foundStaff) {
        if (foundStaff.status !== 'active') {
          setError('This Admin Staff account is currently inactive. Contact Super Admin.');
          return;
        }

        const validPass = foundStaff.password || 'staff123';
        if (password !== validPass) {
          setError('Invalid Admin Staff password. Contact Super Admin to reset your password.');
          return;
        }

        const staffProfile: UserProfile = {
          id: foundStaff.id,
          auth_user_id: foundStaff.auth_user_id,
          name: foundStaff.name,
          email: foundStaff.email,
          phone: foundStaff.phone,
          role: 'staff',
          access_level: foundStaff.access_level,
          status: 'active',
        };
        onLogin(staffProfile);
        return;
      }

      // 3. Fallback for custom staff logins
      if (email.includes('staff')) {
        onLogin({
          id: 'stf_custom_' + Date.now(),
          auth_user_id: 'auth_stf_' + Date.now(),
          name: email.split('@')[0].toUpperCase(),
          email,
          phone: '+91 98421 00000',
          role: 'staff',
          access_level: 'edit',
          status: 'active',
        });
      } else {
        setError('Account not found in Super Admin database. Please check email address.');
      }
    }, 450);
  };

  const selectQuickAccount = (type: 'super_admin' | 'admin_staff') => {
    setSelectedQuickType(type);
    setError(null);

    if (type === 'super_admin') {
      setEmail('kirranvijay@gmail.com');
      setPassword('Kirranst@14');
    } else {
      const activeStaff = staffList[0] || {
        email: 'ganesh.staff@ritrjpm.ac.in',
        password: 'staff123',
      };
      setEmail(activeStaff.email);
      setPassword(activeStaff.password || 'staff123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Ramco Institute of Technology
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            College Bus Operations & Transport Portal
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Quick Role Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Select Sign-In Identity:
              </label>
              <span className="text-[10px] text-blue-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>One-Click Select</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => selectQuickAccount('super_admin')}
                className={`py-3 px-3 rounded-2xl text-xs font-black transition-all border flex items-center justify-center space-x-2 ${
                  selectedQuickType === 'super_admin'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>👑</span>
                <span>Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => selectQuickAccount('admin_staff')}
                className={`py-3 px-3 rounded-2xl text-xs font-black transition-all border flex items-center justify-center space-x-2 ${
                  selectedQuickType === 'admin_staff'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30 ring-2 ring-amber-500/30'
                    : 'bg-slate-950 text-amber-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Staff</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {selectedQuickType === 'super_admin' ? 'Super Admin Email' : 'Admin Staff Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-mono transition-colors"
                  placeholder={selectedQuickType === 'super_admin' ? 'kirranvijay@gmail.com' : 'staff@ritrjpm.ac.in'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-mono transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all duration-200"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Command Portal'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Role Credentials Reference Footnote */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>👑 Super Admin:</span>
              <span className="font-mono text-blue-400">kirranvijay@gmail.com</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10.5px]">
              <span>🛡️ Admin Staff:</span>
              <span>Permissions (Edit/View) auto-applied from profile</span>
            </div>
          </div>
        </div>

        {/* Global Developer & Department Credit */}
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs font-bold text-slate-400 tracking-wide">
            Designed and Developed by <span className="text-blue-400 font-extrabold">Kirran S T</span>
          </p>
          <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
            Department of Information Technology
          </p>
        </div>
      </div>
    </div>
  );
};
