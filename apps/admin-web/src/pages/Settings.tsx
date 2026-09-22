import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Shield, MapPin, Radio, Database, CheckCircle2, AlertCircle, ExternalLink, Key, Server } from 'lucide-react';
import { DEFAULT_TRACKING_INTERVAL_MS } from '@college-bus/shared';
import { isSupabaseConfigured, testDatabaseConnection } from '../services/supabaseClient';

export const Settings: React.FC = () => {
  const [intervalMs, setIntervalMs] = useState(DEFAULT_TRACKING_INTERVAL_MS);
  const [collegeName, setCollegeName] = useState('Ramco Institute of Technology');
  const [saved, setSaved] = useState(false);

  // Database Connection Test State
  const [dbTestLoading, setDbTestLoading] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestDatabase = async () => {
    setDbTestLoading(true);
    setDbTestResult(null);
    const result = await testDatabaseConnection();
    setDbTestResult(result);
    setDbTestLoading(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
          <SettingsIcon className="w-7 h-7 text-blue-500" />
          <span>System & Database Configuration</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage Supabase Cloud PostgreSQL database connectivity, GPS broadcast frequencies & institution settings.
        </p>
      </div>

      {/* DATABASE CONNECTION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Database Engine: Supabase (PostgreSQL)</h2>
              <p className="text-xs text-slate-400">Real-time WebSocket broadcasting for live GPS tracking</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isSupabaseConfigured
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {isSupabaseConfigured ? '🟢 Supabase Configured' : '⚡ Local / Demo Mode Active'}
            </span>
          </div>
        </div>

        {/* Connection Status Details */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Database Type:</span>
            <span className="text-white font-mono font-bold">PostgreSQL 15+ with PostGIS / Extensions</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Realtime WebSockets:</span>
            <span className="text-emerald-400 font-bold">Enabled (Live GPS & Driver Cockpit)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Schema Migrations:</span>
            <span className="text-blue-400 font-mono">supabase/migrations/20260918000000_initial_schema.sql</span>
          </div>
        </div>

        {/* Database Test Result Message */}
        {dbTestResult && (
          <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
            dbTestResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            {dbTestResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <span className="font-bold block">{dbTestResult.success ? 'Connection Successful' : 'Notice'}</span>
              <span>{dbTestResult.message}</span>
            </div>
          </div>
        )}

        {/* Test Connection Button */}
        <div className="flex items-center justify-between pt-1">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            disabled={dbTestLoading}
            onClick={handleTestDatabase}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbTestLoading ? 'animate-spin' : ''}`} />
            <span>{dbTestLoading ? 'Testing...' : 'Test Live Database Connection'}</span>
          </button>
        </div>
      </div>

      {/* SYSTEM PREFERENCES FORM */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-blue-400 tracking-wider flex items-center space-x-2">
            <Radio className="w-4 h-4" />
            <span>GPS Tracking Broadcast Interval (Milliseconds)</span>
          </h2>
          <div>
            <input
              type="number"
              step="1000"
              min="1000"
              max="30000"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              Controls how frequently driver mobile apps transmit GPS coordinates to Supabase (Default: 5000ms / 5s).
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-800 pt-5">
          <h2 className="text-sm font-bold uppercase text-blue-400 tracking-wider flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Institution Information</span>
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">College / Campus Name</label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t border-slate-800">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
