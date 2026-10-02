import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Navigation,
  Bell,
  Database,
  Sun,
  Moon,
  ChevronRight,
  Building2,
  UserRound,
  Activity,
  Compass,
  AlertTriangle,
  BusFront,
  MessageSquareText,
  Cloud,
  RotateCcw,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [tab, setTab] = useState<'General' | 'Tracking & GPS' | 'Notifications' | 'Data & privacy' | 'Appearance'>('General');

  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ritbus-settings') || '{}');
    } catch {
      return {};
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ritbus-theme') as any) || 'dark';
  });

  const updateSetting = (key: string, val: any) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    localStorage.setItem('ritbus-settings', JSON.stringify(next));
  };

  const toggle = (key: string) => {
    updateSetting(key, !settings[key]);
  };

  const handleThemeChange = (next: 'light' | 'dark') => {
    setTheme(next);
    localStorage.setItem('ritbus-theme', next);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${next}`);
  };

  const resetDemoData = () => {
    if (window.confirm('Reset local cache and reload fresh transport state from Supabase?')) {
      localStorage.removeItem('bustrack_buses_v1');
      localStorage.removeItem('bustrack_drivers_v1');
      localStorage.removeItem('bustrack_students_v1');
      localStorage.removeItem('bustrack_routes_v1');
      localStorage.removeItem('bustrack_stops_v1');
      localStorage.removeItem('bustrack_emergencies_v1');
      localStorage.removeItem('bustrack_notifications_v1');
      window.location.reload();
    }
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> PREFERENCES &amp; CONFIGURATION
          </span>
          <h1>
            Settings<span className="headline-period">.</span>
          </h1>
          <p>Manage your workspace preferences, cloud telemetry intervals, and display themes.</p>
        </div>
        <div className="settings-saved">
          <CheckCircle2 size={15} /> Saved automatically
        </div>
      </div>

      {/* 2. Settings Layout with Sidebar Nav */}
      <div className="settings-layout">
        <aside className="panel settings-nav">
          {[
            { id: 'General', label: 'General', icon: SlidersHorizontal },
            { id: 'Tracking & GPS', label: 'Tracking & GPS', icon: Navigation },
            { id: 'Notifications', label: 'Notifications', icon: Bell },
            { id: 'Data & privacy', label: 'Data & privacy', icon: Database },
            { id: 'Appearance', label: 'Appearance', icon: Sun },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id as any)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </aside>

        <div className="settings-content">
          {tab === 'General' && (
            <>
              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Workspace</h2>
                  <p>Campus transport command operations workspace.</p>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Building2 size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Organization</strong>
                    <span>Ramco Institute of Technology — Transport Portal</span>
                  </div>
                  <div className="settings-row-right">
                    <span className="type-chip">RIT Rajapalayam</span>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <UserRound size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Administrator</strong>
                    <span>Department of Information Technology</span>
                  </div>
                  <div className="settings-row-right">
                    <span className="status-badge status-positive">
                      <i /> Super Admin
                    </span>
                  </div>
                </div>
              </section>

              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Regional preferences</h2>
                  <p>Used for schedules, route timestamps, and report generation.</p>
                </div>
                <div className="setting-form-grid">
                  <label>
                    Timezone
                    <select
                      value={settings.timezone || 'Asia/Kolkata'}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                    >
                      <option>Asia/Kolkata (IST)</option>
                      <option>Asia/Singapore</option>
                      <option>UTC</option>
                    </select>
                  </label>
                  <label>
                    Distance units
                    <select
                      value={settings.units || 'Kilometers (km)'}
                      onChange={(e) => updateSetting('units', e.target.value)}
                    >
                      <option>Kilometers (km)</option>
                      <option>Miles (mi)</option>
                    </select>
                  </label>
                </div>
              </section>
            </>
          )}

          {tab === 'Tracking & GPS' && (
            <>
              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Location updates</h2>
                  <p>Control live fleet telemetry, simulation, and stale location alerts.</p>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Activity size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Simulation mode</strong>
                    <span>Animate sample bus positions if live vehicles are parked or stationary.</span>
                  </div>
                  <div className="settings-row-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.simulation !== false}
                      className={`toggle ${settings.simulation !== false ? 'on' : ''}`}
                      onClick={() => toggle('simulation')}
                    >
                      <i />
                    </button>
                  </div>
                </div>

                <div className="setting-form-grid">
                  <label>
                    GPS update interval
                    <select
                      value={settings.interval || '5 seconds'}
                      onChange={(e) => updateSetting('interval', e.target.value)}
                    >
                      <option>3 seconds</option>
                      <option>5 seconds</option>
                      <option>10 seconds</option>
                    </select>
                  </label>
                  <label>
                    Stale location warning
                    <select
                      value={settings.stale || '2 minutes'}
                      onChange={(e) => updateSetting('stale', e.target.value)}
                    >
                      <option>1 minute</option>
                      <option>2 minutes</option>
                      <option>5 minutes</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Map display</h2>
                  <p>Map view preferences and route stop overlays.</p>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Compass size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Show route stop markers</strong>
                    <span>Keep configured boarding stops visible on the radar view.</span>
                  </div>
                  <div className="settings-row-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.stops !== false}
                      className={`toggle ${settings.stops !== false ? 'on' : ''}`}
                      onClick={() => toggle('stops')}
                    >
                      <i />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'Notifications' && (
            <section className="panel settings-group">
              <div className="settings-group-head">
                <h2>Operational alerts</h2>
                <p>Choose which alerts trigger desktop push and visual banner notifications.</p>
              </div>
              <div className="settings-row">
                <span className="settings-row-icon">
                  <AlertTriangle size={16} />
                </span>
                <div className="settings-row-copy">
                  <strong>Emergency SOS alerts</strong>
                  <span>High-priority driver distress SOS and emergency incidents.</span>
                </div>
                <div className="settings-row-right">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emergencyAlerts !== false}
                    className={`toggle ${settings.emergencyAlerts !== false ? 'on' : ''}`}
                    onClick={() => toggle('emergencyAlerts')}
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <span className="settings-row-icon">
                  <BusFront size={16} />
                </span>
                <div className="settings-row-copy">
                  <strong>Delay notifications</strong>
                  <span>Notify if a bus is running behind scheduled corridor ETA.</span>
                </div>
                <div className="settings-row-right">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.delayAlerts !== false}
                    className={`toggle ${settings.delayAlerts !== false ? 'on' : ''}`}
                    onClick={() => toggle('delayAlerts')}
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <span className="settings-row-icon">
                  <MessageSquareText size={16} />
                </span>
                <div className="settings-row-copy">
                  <strong>Broadcast confirmations</strong>
                  <span>Show instant confirmation after composing an announcement.</span>
                </div>
                <div className="settings-row-right">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.broadcastAlerts !== false}
                    className={`toggle ${settings.broadcastAlerts !== false ? 'on' : ''}`}
                    onClick={() => toggle('broadcastAlerts')}
                  >
                    <i />
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === 'Data & privacy' && (
            <>
              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Cloud &amp; storage status</h2>
                  <p>Database connection and local device storage cache.</p>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Cloud size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Supabase Cloud Database</strong>
                    <span>Live real-time sync with mobile applications and driver tablets.</span>
                  </div>
                  <div className="settings-row-right">
                    <span className="status-badge status-positive">
                      <i /> Connected
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Database size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Browser local cache</strong>
                    <span>Offline backup and rapid page reload acceleration.</span>
                  </div>
                  <div className="settings-row-right">
                    <span className="status-badge status-positive">
                      <i /> Active
                    </span>
                  </div>
                </div>
              </section>

              <div className="settings-danger">
                <div>
                  <strong>Reset local cache</strong>
                  <span>Restore local state cache and re-pull clean cloud data from Supabase.</span>
                </div>
                <button type="button" className="button button-danger" onClick={resetDemoData}>
                  <RotateCcw size={14} /> Reset cache
                </button>
              </div>
            </>
          )}

          {tab === 'Appearance' && (
            <>
              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Display theme</h2>
                  <p>Switch between dark mode and light mode across all portal pages.</p>
                </div>
                <div className="theme-choice-row">
                  <button
                    type="button"
                    className={`theme-choice ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <span className="theme-preview light-preview">
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>
                      <Sun size={15} /> Light
                    </strong>
                  </button>

                  <button
                    type="button"
                    className={`theme-choice ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <span className="theme-preview dark-preview">
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>
                      <Moon size={15} /> Dark
                    </strong>
                  </button>
                </div>
              </section>

              <section className="panel settings-group">
                <div className="settings-group-head">
                  <h2>Motion &amp; accessibility</h2>
                  <p>Control visual transition speeds and decorative animations.</p>
                </div>
                <div className="settings-row">
                  <span className="settings-row-icon">
                    <Zap size={16} />
                  </span>
                  <div className="settings-row-copy">
                    <strong>Reduced motion</strong>
                    <span>Use shorter transitions and disable non-essential bus movements.</span>
                  </div>
                  <div className="settings-row-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.reduceMotion || false}
                      className={`toggle ${settings.reduceMotion ? 'on' : ''}`}
                      onClick={() => toggle('reduceMotion')}
                    >
                      <i />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
};
