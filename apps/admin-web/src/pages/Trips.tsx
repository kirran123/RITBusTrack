import React, { useState } from 'react';
import { Trip, Bus, Driver, Route } from '@college-bus/shared';
import {
  History,
  Download,
  MapPin,
  Calendar,
  Clock,
  Eye,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Navigation,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

const terminalGreenIcon = L.divIcon({
  className: 'custom-terminal-green',
  html: `
    <div style="background:#059669;color:white;padding:3px 8px;border-radius:12px;font-weight:900;font-size:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);white-space:nowrap;">
      🟢 START POINT
    </div>
  `,
  iconSize: [90, 24],
  iconAnchor: [45, 12],
});

const terminalRedIcon = L.divIcon({
  className: 'custom-terminal-red',
  html: `
    <div style="background:#dc2626;color:white;padding:3px 8px;border-radius:12px;font-weight:900;font-size:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);white-space:nowrap;">
      🏁 END POINT
    </div>
  `,
  iconSize: [80, 24],
  iconAnchor: [40, 12],
});

interface TripsProps {
  trips: Trip[];
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
}

export const Trips: React.FC<TripsProps> = ({ trips, buses, drivers, routes }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const formatTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const calculateDuration = (start?: string, end?: string | null) => {
    if (!start) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffSec = Math.floor((endTime - startTime) / 1000);
    if (diffSec <= 0) return '0 min';
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleExportCSV = () => {
    const headers = [
      'Trip ID',
      'Bus Number',
      'Route Name',
      'Driver Name',
      'Departure Time (Start)',
      'Arrival Time (End)',
      'Duration',
      'Distance (km)',
      'Status',
    ];
    const rows = trips.map((t) => {
      const bus = buses.find((b) => b.id === t.bus_id);
      const route = routes.find((r) => r.id === t.route_id);
      const driver = drivers.find((d) => d.id === t.driver_id);
      return [
        t.id,
        bus?.bus_number || 'BUS',
        route?.route_name || 'Route',
        driver?.profile?.name || 'Driver',
        t.start_time ? new Date(t.start_time).toLocaleString() : 'N/A',
        t.end_time ? new Date(t.end_time).toLocaleString() : 'In Progress',
        calculateDuration(t.start_time, t.end_time),
        t.distance_travelled || 0,
        t.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `college_bus_trip_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample historical path points for modal path replay
  const samplePathPoints: [number, number][] = [
    [9.4475, 77.545],
    [9.449, 77.5472],
    [9.4505, 77.5495],
    [9.4512, 77.551],
    [9.452, 77.5535],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <History className="w-7 h-7 text-blue-500" />
            <span>Driver Trip Timings & Telemetry Log</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit log of exact departure start times, terminal completion arrival times, duration, and distance logged by each driver.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition-all shadow-md"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Export Trips CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Trips Now</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {trips.filter((t) => t.status === 'active').length} Bus Trips
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Today</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {trips.filter((t) => t.status === 'completed').length} Logs
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bus Distance</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {trips.reduce((acc, t) => acc + (t.distance_travelled || 0), 0).toFixed(1)} km
            </div>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 min-w-[1050px]">
            <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Bus & Vehicle</th>
                <th className="px-6 py-4 whitespace-nowrap">Route & Direction</th>
                <th className="px-6 py-4 whitespace-nowrap">Bus Driver</th>
                <th className="px-6 py-4 whitespace-nowrap">Start Time (Dep)</th>
                <th className="px-6 py-4 whitespace-nowrap">End Time (Arr)</th>
                <th className="px-6 py-4 whitespace-nowrap">Duration</th>
                <th className="px-6 py-4 whitespace-nowrap">Distance</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">GPS Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No trip logs recorded yet for this session.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const bus = buses.find((b) => b.id === trip.bus_id);
                  const route = routes.find((r) => r.id === trip.route_id);
                  const driver = drivers.find((d) => d.id === trip.driver_id);
                  const color = route?.route_color || '#3b82f6';
                  const isActive = trip.status === 'active';

                  return (
                    <tr key={trip.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Bus & Vehicle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-2.5 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 font-black text-xs border border-blue-500/20 whitespace-nowrap tracking-wide">
                                {bus?.bus_number || 'BUS-01'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-1">
                              {bus?.registration_number || bus?.bus_name || 'TN 84 AX 1001'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Route & Direction */}
                      <td className="px-6 py-4">
                        <div className="text-white font-bold text-sm tracking-tight">
                          {route?.route_name || 'Route'}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1 font-medium">
                          <span className="text-slate-300">{route?.start_location || 'Start'}</span>
                          <span className="text-blue-400 font-bold">→</span>
                          <span className="text-slate-300">{route?.destination || 'Campus'}</span>
                        </div>
                      </td>

                      {/* Fleet Driver */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-200 font-semibold text-sm">
                          {driver?.profile?.name || 'Assigned Driver'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {driver?.phone || '+91 91234 56780'}
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                        <div className="text-emerald-400 font-bold text-sm">
                          {formatTimestamp(trip.start_time)}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {formatDate(trip.start_time)}
                        </div>
                      </td>

                      {/* End Time */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                        {trip.end_time ? (
                          <>
                            <div className="text-slate-300 font-bold text-sm">
                              {formatTimestamp(trip.end_time)}
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {formatDate(trip.end_time)}
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/20 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>IN PROGRESS</span>
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-200">
                        {calculateDuration(trip.start_time, trip.end_time)}
                      </td>

                      {/* Distance */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-300">
                        {(trip.distance_travelled || 0).toFixed(1)} km
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase whitespace-nowrap border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                              : trip.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          )}
                          <span>
                            {isActive ? 'In Transit' : trip.status === 'completed' ? 'Arrived' : trip.status}
                          </span>
                        </span>
                      </td>

                      {/* GPS Path Replay */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-bold text-blue-400 flex items-center space-x-1.5 ml-auto border border-slate-700 transition-all shadow-sm group"
                        >
                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span className="whitespace-nowrap">Inspect Path</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPS Path Replay Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">GPS Route Path Audit</h2>
                <p className="text-xs text-slate-400">
                  Trip {selectedTrip.id} &bull; Started: {formatTimestamp(selectedTrip.start_time)} &bull; Ended:{' '}
                  {formatTimestamp(selectedTrip.end_time)}
                </p>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-800 mb-4">
              <MapContainer
                center={samplePathPoints[0]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="dark-map-tiles"
                />
                <Polyline positions={samplePathPoints} color="#2563eb" weight={5} opacity={0.8} />

                {/* Start Terminal Pin */}
                <Marker position={samplePathPoints[0]} icon={terminalGreenIcon}>
                  <Popup>
                    <div className="text-xs font-bold">🟢 START POINT &bull; {formatTimestamp(selectedTrip.start_time)}</div>
                  </Popup>
                </Marker>

                {/* End Terminal Pin */}
                <Marker position={samplePathPoints[samplePathPoints.length - 1]} icon={terminalRedIcon}>
                  <Popup>
                    <div className="text-xs font-bold">🏁 END POINT &bull; {formatTimestamp(selectedTrip.end_time)}</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <div>Logged Distance: <span className="text-white font-bold">{selectedTrip.distance_travelled || 0} km</span></div>
              <div>Duration: <span className="text-white font-bold">{calculateDuration(selectedTrip.start_time, selectedTrip.end_time)}</span></div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
