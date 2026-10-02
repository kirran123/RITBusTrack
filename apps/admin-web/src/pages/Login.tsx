import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Shield,
  Sun,
  Moon,
  Loader2,
  CircleHelp,
  ShieldAlert,
} from 'lucide-react';
import { UserProfile, StaffUser } from '@college-bus/shared';
import { INITIAL_STAFF, INITIAL_STAFF_COMMUTERS } from '../services/mockDataStore';
import { MASTER_STAFF_USERS, MASTER_STAFF_COMMUTERS } from '@college-bus/shared';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  staffList?: StaffUser[];
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
}

export const Login: React.FC<LoginProps> = ({
  onLogin,
  staffList = INITIAL_STAFF,
  theme = 'dark',
  setTheme,
}) => {
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'admin_staff'>('super_admin');
  const [email, setEmail] = useState('deptit@ritrjpm.ac.in');
  const [password, setPassword] = useState('deptit@rit');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetHint, setResetHint] = useState<string>('');

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const handleRoleChange = (role: 'super_admin' | 'admin_staff') => {
    setSelectedRole(role);
    setError(null);
    if (role === 'super_admin') {
      setEmail('deptit@ritrjpm.ac.in');
      setPassword('deptit@rit');
    } else {
      setEmail('dr.kavitha@ritrjpm.ac.in');
      setPassword('staff123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Check if user is Super Admin
    const isSuperAdminEmail =
      normalizedEmail === 'kirranvijay@gmail.com' ||
      normalizedEmail === 'deptit@ritrjpm.ac.in' ||
      normalizedEmail === 'admin@college.edu' ||
      normalizedEmail === 'admin' ||
      normalizedEmail === 'admin@ritrjpm.ac.in';
    const isSuperAdminPass =
      trimmedPass === 'Kirranst@14' ||
      trimmedPass.toLowerCase() === 'kirranst@14' ||
      trimmedPass === 'deptit@rit' ||
      trimmedPass === 'admin123' ||
      trimmedPass.toLowerCase() === 'admin123' ||
      trimmedPass === 'admin' ||
      trimmedPass === 'password';

    // 2. Aggregate all Staff and Faculty Commuters across sources
    let storedStaffCommuters: any[] = [];
    let storedStaffList: any[] = [];
    try {
      const rawCommuters = localStorage.getItem('bustrack_staff_commuters_v1');
      if (rawCommuters) storedStaffCommuters = JSON.parse(rawCommuters);
      const rawStaff = localStorage.getItem('bustrack_staff_v1');
      if (rawStaff) storedStaffList = JSON.parse(rawStaff);
    } catch {}

    const allStaffCandidates: any[] = [
      ...staffList,
      ...storedStaffList,
      ...INITIAL_STAFF,
      ...MASTER_STAFF_USERS,
      ...storedStaffCommuters,
      ...INITIAL_STAFF_COMMUTERS,
      ...MASTER_STAFF_COMMUTERS,
    ];

    const foundStaff = allStaffCandidates.find((s: any) => {
      const sEmail = (s.email || s.profile?.email || '').toLowerCase();
      const sEmp = (s.employee_id || s.staffId || s.id || '').toLowerCase();
      return sEmail === normalizedEmail || sEmp === normalizedEmail;
    });

    // 3. Try Supabase Auth if online
    if (supabase && normalizedEmail.includes('@')) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: trimmedPass,
        });
        if (!authError && authData?.user) {
          setLoading(false);
          const uRole = (authData.user.user_metadata?.role || (isSuperAdminEmail ? 'admin' : 'staff')) as any;
          onLogin({
            id: authData.user.id,
            auth_user_id: authData.user.id,
            name: authData.user.user_metadata?.name || (authData.user.email ? authData.user.email.split('@')[0] : 'Admin User'),
            email: authData.user.email || normalizedEmail,
            phone: authData.user.phone || '+91 9876543210',
            role: uRole === 'admin' ? 'admin' : 'staff',
            access_level: 'edit',
            status: 'active',
          });
          return;
        }
      } catch {}
    }

    setTimeout(() => {
      setLoading(false);

      // Branch A: Super Admin credentials
      if (isSuperAdminEmail) {
        if (!isSuperAdminPass) {
          setError('Invalid Super Admin password. (Default: admin123, deptit@rit, or Kirranst@14)');
          return;
        }

        const superAdminProfile: UserProfile = {
          id: normalizedEmail === 'deptit@ritrjpm.ac.in' ? 'sa_dept_it' : 'sa_01',
          auth_user_id: 'auth_super_admin',
          name: normalizedEmail === 'deptit@ritrjpm.ac.in' ? 'Dept of IT Super Admin' : 'Super Admin (Kirran S T)',
          email: normalizedEmail.includes('@') ? normalizedEmail : 'admin@ritrjpm.ac.in',
          phone: '+91 9876543210',
          role: 'admin',
          status: 'active',
        };
        onLogin(superAdminProfile);
        return;
      }

      // Branch B: Staff / Faculty Credentials
      if (foundStaff) {
        const expectedPass = foundStaff.password || 'staff123';
        if (
          trimmedPass !== expectedPass &&
          trimmedPass !== 'staff123' &&
          trimmedPass !== 'admin123'
        ) {
          setError('Invalid password. Default password is staff123');
          return;
        }

        const staffProfile: UserProfile = {
          id: foundStaff.id,
          auth_user_id: foundStaff.auth_user_id || `auth_${foundStaff.id}`,
          name: foundStaff.name || foundStaff.profile?.name || 'Staff Coordinator',
          email: foundStaff.email || foundStaff.profile?.email || normalizedEmail,
          phone: foundStaff.phone || foundStaff.profile?.phone || '+91 96292 84690',
          role: 'staff',
          access_level: foundStaff.access_level || 'edit',
          status: 'active',
        };
        onLogin(staffProfile);
        return;
      }

      // Branch C: Official institutional email fallback / demo sign-in
      if (
        normalizedEmail.includes('@ritrjpm.ac.in') ||
        normalizedEmail.includes('admin') ||
        normalizedEmail.includes('staff') ||
        selectedRole === 'admin_staff' ||
        normalizedEmail.includes('@')
      ) {
        onLogin({
          id: 'stf_user_' + Date.now(),
          auth_user_id: 'auth_stf_' + Date.now(),
          name: normalizedEmail.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
          email: normalizedEmail,
          phone: '+91 96292 84690',
          role: selectedRole === 'super_admin' ? 'admin' : 'staff',
          access_level: 'edit',
          status: 'active',
        });
        return;
      }

      setError('Account not found. Please enter your registered email (e.g. deptit@ritrjpm.ac.in or admin123).');
    }, 280);
  };

  return (
    <div className={`login-screen theme-${theme}`}>
      {/* Left Column: Campus Bus Illustration & Branding */}
      <div className="login-aside">
        <div className="login-brand">
          <span className="brand-mark brand-mark--image">
            <img src="/ritbustrack-logo.png" alt="RITBusTrack" />
          </span>
          <span>
            RIT<span>Bus</span>Track
          </span>
        </div>

        <div className="login-aside-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> TRANSPORT COMMAND CENTER
          </span>
          <h1>
            Every route.
            <br />
            In good hands.
          </h1>
          <p>
            One clear view of your fleet, your people, and the journeys that connect them across Ramco Institute of Technology.
          </p>

          {/* Animated Campus Bus Scene */}
          <div
            className="login-bus-scene"
            role="img"
            aria-label="A side-view campus bus moving through wind along a road"
          >
            <span className="bus-wind bus-wind-one" />
            <span className="bus-wind bus-wind-two" />
            <span className="bus-wind bus-wind-three" />
            <span className="bus-road">
              <i />
              <i />
              <i />
            </span>
            <span className="bus-ground-shadow" />
            <img
              className="login-side-bus"
              src="/login-side-bus.png"
              alt="RIT Campus Bus Illustration"
            />
            <span className="login-arrival-caption">
              RIT CAMPUS <i /> LIVE ROUTE
            </span>
          </div>
        </div>

        <small className="login-aside-footer">
          RITBusTrack · Transport operations
        </small>
      </div>

      {/* Right Column: Sign In Form & Settings */}
      <div className="login-main">
        {/* Theme Toggle Button */}
        {setTheme && (
          <button
            type="button"
            className="icon-button login-theme"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        )}

        <div className="login-form-wrap">
          <span className="login-form-mark">
            <ShieldCheck size={21} />
          </span>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p>Enter your administrator details to continue.</p>

          {/* Segmented Role Switcher */}
          <div className="change-type-tabs" style={{ padding: 0, marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => handleRoleChange('super_admin')}
              className={selectedRole === 'super_admin' ? 'active' : ''}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Shield size={14} />
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin_staff')}
              className={selectedRole === 'admin_staff' ? 'active' : ''}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <ShieldCheck size={14} />
              <span>Transport Staff</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--red-soft)',
                  color: 'var(--red)',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <label>
              Work email
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'super_admin' ? 'deptit@ritrjpm.ac.in' : 'name@ritrjpm.ac.in'}
                  autoComplete="username"
                  style={{ paddingLeft: '32px' }}
                />
                <Mail
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </label>

            <label>
              Password
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingLeft: '32px' }}
                />
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetHint(
                    `Password hint: For Super Admin use 'deptit@rit' or 'admin123'. For Staff use 'staff123'.`
                  );
                }}
              >
                Forgot password?
              </button>
              {resetHint && (
                <small className="login-reset-hint" role="status" style={{ marginTop: '6px' }}>
                  {resetHint}
                </small>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary login-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign in as {selectedRole === 'super_admin' ? 'Super Admin' : 'Staff'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="login-demo-hint">
              <CircleHelp size={13} />
              <span>Demo credentials prefilled · Click Sign in to test</span>
            </div>
          </form>
        </div>

        <footer>
          Protected workspace <span>·</span> Dept. of Information Technology <span>·</span> RIT
        </footer>
      </div>
    </div>
  );
};
