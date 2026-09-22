import React, { useState } from 'react';
import { Bus, Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck, Shield, KeyRound, Loader2 } from 'lucide-react';
import { UserProfile, StaffUser } from '@college-bus/shared';
import { INITIAL_STAFF } from '../services/mockDataStore';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  staffList?: StaffUser[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, staffList = INITIAL_STAFF }) => {
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'admin_staff'>('super_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPass = password.trim();

      // 1. Super Admin Authentication
      const isSuperAdminEmail =
        normalizedEmail === 'kirranvijay@gmail.com' ||
        normalizedEmail === 'admin@college.edu' ||
        normalizedEmail === 'admin' ||
        normalizedEmail === 'admin@ritrjpm.ac.in';
      const isSuperAdminPass = trimmedPass === 'Kirranst@14' || trimmedPass === 'admin123';

      if (selectedRole === 'super_admin') {
        if (!isSuperAdminEmail) {
          setError('Super Admin account not found. Please verify your email address.');
          return;
        }
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

      // 2. Admin Staff Authentication
      const foundStaff = staffList.find((s) => s.email.toLowerCase() === normalizedEmail);
      if (foundStaff) {
        if (foundStaff.status !== 'active') {
          setError('This staff account is currently inactive. Contact transport administrator.');
          return;
        }

        const validPass = foundStaff.password || 'staff123';
        if (trimmedPass !== validPass) {
          setError('Invalid password. Please contact transport administrator.');
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
      if (normalizedEmail.includes('staff')) {
        onLogin({
          id: 'stf_custom_' + Date.now(),
          auth_user_id: 'auth_stf_' + Date.now(),
          name: normalizedEmail.split('@')[0].toUpperCase(),
          email: normalizedEmail,
          phone: '+91 98421 00000',
          role: 'staff',
          access_level: 'edit',
          status: 'active',
        });
      } else {
        setError('Staff account not found. Please verify your official email.');
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 space-y-6">
        {/* Institutional Branding Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 ring-1 ring-white/10">
            <Bus className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Campus Transit Command
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Ramco Institute of Technology
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Official College Bus Tracking & Transport Portal
            </p>
          </div>
        </div>

        {/* Executive Glassmorphic Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-7 shadow-2xl backdrop-blur-2xl space-y-5 ring-1 ring-white/5">
          {/* Segmented Role Switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Account Role
              </label>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                <span>Authorized Only</span>
              </span>
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('super_admin');
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  selectedRole === 'super_admin'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin_staff');
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  selectedRole === 'admin_staff'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Transport Staff</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {selectedRole === 'super_admin' ? 'Super Admin Email' : 'Staff Official Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/90 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 text-xs font-mono transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600"
                  placeholder={selectedRole === 'super_admin' ? 'kirranvijay@gmail.com' : 'name@ritrjpm.ac.in'}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/90 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 text-xs font-mono transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                selectedRole === 'super_admin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25 active:scale-[0.99]'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/25 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedRole === 'super_admin'
                      ? 'Sign In as Super Admin'
                      : 'Sign In as Transport Staff'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure SSL Tagline */}
          <div className="pt-2 text-center">
            <p className="text-[10.5px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
              <span>🔒</span>
              <span>256-Bit SSL Encrypted Campus Transit System</span>
            </p>
          </div>
        </div>

        {/* Developer & Institutional Credits */}
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs font-bold text-slate-400 tracking-wide">
            Designed and Developed by <span className="text-blue-400 font-extrabold">Kirran S T</span>
          </p>
          <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
            Department of Information Technology &bull; RIT
          </p>
        </div>
      </div>
    </div>
  );
};
