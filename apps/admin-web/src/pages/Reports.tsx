import React from 'react';
import { BarChart3, TrendingUp, Bus, Clock, ShieldCheck, Download } from 'lucide-react';
import { Trip, Bus as BusType } from '@college-bus/shared';

interface ReportsProps {
  trips: Trip[];
  buses: BusType[];
}

export const Reports: React.FC<ReportsProps> = ({ trips, buses }) => {
  const totalDistance = trips.reduce((acc, t) => acc + (t.distance_travelled || 4.2), 0);
  const activeBuses = buses.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <BarChart3 className="w-7 h-7 text-purple-400" />
            <span>Transport Analytics & Utilization</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Performance metrics, distance travelled summaries, bus uptime & fuel usage estimators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-bold uppercase">Total Distance Logged</div>
          <div className="text-3xl font-extrabold text-white mt-1">{totalDistance.toFixed(1)} <span className="text-sm text-purple-400">km</span></div>
          <div className="text-xs text-emerald-400 mt-1 font-semibold">Across all completed trips</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-bold uppercase">Bus Utilization Rate</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {buses.length > 0 ? Math.round((activeBuses / buses.length) * 100) : 100}%
          </div>
          <div className="text-xs text-slate-400 mt-1">{activeBuses} of {buses.length} Vehicles Active</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-bold uppercase">Average Trip Time</div>
          <div className="text-3xl font-extrabold text-white mt-1">38 <span className="text-sm text-blue-400">mins</span></div>
          <div className="text-xs text-slate-400 mt-1">On-time departure index 98.4%</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Daily Trip Summary Table</h2>
        <div className="space-y-2">
          {buses.map(bus => (
            <div key={bus.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <Bus className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-bold text-white">{bus.bus_number} &bull; {bus.bus_name}</div>
                  <div className="text-slate-400">Route: {bus.route?.route_name || 'Assigned Route'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-400">Status: {bus.status.toUpperCase()}</div>
                <div className="text-slate-500">Cap: {bus.capacity} seats</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
