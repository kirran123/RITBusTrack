import React from 'react';
import { EmergencyAlert } from '@college-bus/shared';
import { AlertTriangle, CheckCircle2, ShieldCheck, MapPin, Clock, Phone } from 'lucide-react';

interface EmergencyProps {
  emergencies: EmergencyAlert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Emergency: React.FC<EmergencyProps> = ({
  emergencies,
  onAcknowledge,
  onResolve,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const activeEmergencies = emergencies.filter(e => e.status !== 'RESOLVED');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/60 to-slate-900 p-6 rounded-3xl border border-rose-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <AlertTriangle className="w-7 h-7 text-rose-500 animate-pulse" />
            <span>Emergency Command & Alert Response</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time SOS notifications, driver breakdown alerts & location telemetry dispatch.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs">
          {activeEmergencies.length} Active Incident{activeEmergencies.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Active Incidents List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Active Emergency Incidents
        </h2>

        {activeEmergencies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">All Clear & Safe</h3>
            <p className="text-xs text-slate-400 mt-1">No active emergency alerts reported by drivers.</p>
          </div>
        ) : (
          activeEmergencies.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold">
                    🚨
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg">
                      {alert.bus?.bus_number || 'BUS-01'} &bull; {alert.type.toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center mt-0.5">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Reported: {new Date(alert.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    alert.status === 'ACTIVE' 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Message Details */}
              <div className="text-slate-200 text-sm bg-slate-950 p-4 rounded-2xl border border-slate-800 font-medium">
                "{alert.message}"
              </div>

              {/* Driver & Location Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">{alert.driver?.profile?.name || 'Assigned Driver'}</div>
                    <div className="text-slate-400">{alert.driver?.phone || '+91 9123456780'}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold text-white">GPS Coordinate Location</div>
                    <div className="text-slate-400 font-mono">Lat: {alert.latitude}, Long: {alert.longitude}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                {isEditable ? (
                  <>
                    {alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
                      >
                        Acknowledge Alert
                      </button>
                    )}
                    <button
                      onClick={() => onResolve(alert.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Resolved</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-bold border border-slate-700">
                    Incident Monitored (Read Only)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolved History */}
      {resolvedEmergencies.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Resolved Incidents History ({resolvedEmergencies.length})
          </h2>
          <div className="space-y-2">
            {resolvedEmergencies.map((res) => (
              <div key={res.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                <div>
                  <span className="font-bold text-slate-200">{res.bus?.bus_number}</span> - {res.message}
                </div>
                <span className="text-emerald-400 font-bold">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
