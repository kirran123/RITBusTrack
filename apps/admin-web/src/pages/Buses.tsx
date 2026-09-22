import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Driver, Route, UserProfile } from '@college-bus/shared';
import { 
  Bus as BusIcon, Plus, Search, Edit2, Trash2, MapPin, UserCheck, RefreshCw, AlertTriangle, ShieldCheck, X, Lock 
} from 'lucide-react';

interface BusesProps {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  onSaveBus: (bus: Bus) => void;
  onDeleteBus: (busId: string) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
}

export const Buses: React.FC<BusesProps> = ({
  buses,
  drivers,
  routes,
  onSaveBus,
  onDeleteBus,
  onSubstituteDriver,
  onSwapBus,
  onRevertSubstituteDriver,
  onRevertBusSwap,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit !== undefined ? canEdit : (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  // Substitute Driver Modal State
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteBus, setSubstituteBus] = useState<Bus | null>(null);
  const [selectedSubDriverId, setSelectedSubDriverId] = useState('');
  const [substituteReason, setSubstituteReason] = useState('Driver On Medical Leave / Emergency');

  // Bus Swap Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapCurrentBus, setSwapCurrentBus] = useState<Bus | null>(null);
  const [selectedReplacementBusId, setSelectedReplacementBusId] = useState('');
  const [swapReason, setSwapReason] = useState('Vehicle Under Maintenance / Mechanical Breakdown');

  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [capacity, setCapacity] = useState(55);
  const [routeId, setRouteId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');

  const openCreateModal = () => {
    setEditingBus(null);
    setBusNumber(`BUS-0${buses.length + 1}`);
    setRegistrationNumber('TN 84 AX ' + (1000 + buses.length + 1));
    setBusName('Express Bus ' + (buses.length + 1));
    setCapacity(55);
    setRouteId(routes[0]?.id || '');
    setDriverId(drivers[0]?.id || '');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setBusNumber(bus.bus_number);
    setRegistrationNumber(bus.registration_number);
    setBusName(bus.bus_name);
    setCapacity(bus.capacity);
    setRouteId(bus.route_id || '');
    const matchedDriver = drivers.find(d => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
    setDriverId(matchedDriver?.id || bus.assigned_driver_id || '');
    setStatus(bus.status);
    setIsModalOpen(true);
  };

  const openSubstituteModal = (bus: Bus) => {
    setSubstituteBus(bus);
    const availableDrivers = drivers.filter(d => d.id !== bus.assigned_driver_id);
    setSelectedSubDriverId(bus.substitute_driver_id || availableDrivers[0]?.id || '');
    setIsSubstituteModalOpen(true);
  };

  const handleApplySubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (substituteBus && onSubstituteDriver) {
      onSubstituteDriver(substituteBus.id, selectedSubDriverId, substituteReason);
    }
    setIsSubstituteModalOpen(false);
  };

  const openSwapModal = (bus: Bus) => {
    setSwapCurrentBus(bus);
    const availableBuses = buses.filter(b => b.id !== bus.id);
    setSelectedReplacementBusId(availableBuses[0]?.id || '');
    setIsSwapModalOpen(true);
  };

  const handleApplySwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (swapCurrentBus && swapCurrentBus.route_id && onSwapBus) {
      onSwapBus(swapCurrentBus.route_id, selectedReplacementBusId, swapReason);
    }
    setIsSwapModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBus: Bus = {
      id: editingBus ? editingBus.id : 'b_' + Date.now(),
      bus_number: busNumber,
      registration_number: registrationNumber,
      bus_name: busName,
      capacity: Number(capacity),
      route_id: routeId || null,
      assigned_driver_id: driverId || null,
      substitute_driver_id: editingBus?.substitute_driver_id || null,
      is_standby_replacement: editingBus?.is_standby_replacement || false,
      status,
      route: routes.find(r => r.id === routeId),
      driver: drivers.find(d => d.id === (editingBus?.substitute_driver_id || driverId)),
    };

    onSaveBus(newBus);
    setIsModalOpen(false);
  };

  const filteredBuses = buses.filter(b => 
    b.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.bus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <BusIcon className="w-7 h-7 text-blue-500" />
            <span>Bus Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Allocate primary & substitute drivers, manage vehicle swaps for maintenance/emergencies, and configure capacity.
          </p>
        </div>

        {isEditable ? (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Bus</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sky-400 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>View-Only Mode</span>
          </div>
        )}
      </div>

      {/* Quick Ops Control Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 p-4 rounded-2xl border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Driver Reassignment System</h3>
              <p className="text-xs text-slate-400">Instantly substitute another driver if regular driver is unavailable.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[11px] font-bold rounded-lg border border-blue-500/30">
            Active
          </span>
        </div>

        <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bus Breakdown & Standby Swap</h3>
              <p className="text-xs text-slate-400">Replace broken bus with a standby vehicle on the same route.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[11px] font-bold rounded-lg border border-amber-500/30">
            Emergency Ready
          </span>
        </div>
      </div>

      {/* Active Substitutions & Swaps Warning Banner */}
      {buses.some(b => !!b.substitute_driver_id || !!b.is_standby_replacement) && (
        <div className="bg-amber-950/40 border-2 border-amber-500/40 rounded-3xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-amber-300 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Active Temporary Bus Substitutions in Effect</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-200">
            {buses.filter(b => !!b.substitute_driver_id).map(bus => {
              const subDriver = drivers.find(d => d.id === bus.substitute_driver_id);
              const regDriver = drivers.find(d => d.id === bus.assigned_driver_id);
              return (
                <div key={'banner_sub_' + bus.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-amber-300">
                      {bus.bus_number}: Substitute Driver <span className="text-white">{subDriver?.profile?.name || 'Substitute'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Regular Driver: <span className="text-slate-300 font-medium">{regDriver?.profile?.name || 'Regular Driver'}</span> (Pending Revert)
                    </div>
                  </div>
                  {isEditable && onRevertSubstituteDriver && (
                    <button
                      onClick={() => onRevertSubstituteDriver(bus.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 shadow transition-all shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Revert Driver</span>
                    </button>
                  )}
                </div>
              );
            })}

            {buses.filter(b => !!b.is_standby_replacement && !!b.route_id).map(bus => {
              const r = routes.find(rt => rt.id === bus.route_id);
              const orig = buses.find(b => b.id === bus.original_bus_id || b.original_route_id === bus.route_id);
              return (
                <div key={'banner_swap_' + bus.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-indigo-500/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-indigo-300">
                      {r?.route_name}: Standby Bus <span className="text-white">{bus.bus_number}</span> Active
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Regular Bus: <span className="text-slate-300 font-medium">{orig?.bus_number || 'Regular Bus'}</span> (Under Maintenance)
                    </div>
                  </div>
                  {isEditable && onRevertBusSwap && bus.route_id && (
                    <button
                      onClick={() => onRevertBusSwap(bus.route_id!)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 shadow transition-all shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restore Bus</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bus number or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold hidden sm:block">
          Total: {buses.length} Buses &bull; {buses.filter(b => b.status === 'active').length} Active
        </div>
      </div>

      {/* Buses Data Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Bus Identifier</th>
                <th className="px-6 py-4">Reg Number</th>
                <th className="px-6 py-4">Assigned Route</th>
                <th className="px-6 py-4">Operating Driver & Allocation</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Quick Reassign & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBuses.map((bus) => {
                const route = routes.find(r => r.id === bus.route_id);
                const primaryDriver = drivers.find(d => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
                const subDriver = drivers.find(d => d.id === bus.substitute_driver_id);
                const originalSwappedBus = buses.find(b => b.id === bus.original_bus_id || b.original_route_id === bus.route_id);
                const standbyReplacementBus = buses.find(b => b.id === bus.swapped_with_bus_id);

                return (
                  <tr key={bus.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-black">
                        {bus.bus_number.split('-')[1] || bus.bus_number.replace('BUS', '').trim()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span>{bus.bus_number}</span>
                          {bus.is_standby_replacement && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                              STANDBY SWAP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-normal">{bus.bus_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{bus.registration_number}</td>
                    <td className="px-6 py-4 text-slate-200">
                      {route ? (
                        <div>
                          <span className="font-semibold text-white">{route.route_name}</span>
                          {bus.is_standby_replacement && originalSwappedBus && (
                            <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                              Replacing Regular {originalSwappedBus.bus_number}
                            </div>
                          )}
                        </div>
                      ) : bus.swapped_with_bus_id && standbyReplacementBus ? (
                        <div>
                          <span className="text-amber-400 font-semibold">🔧 Swapped Out</span>
                          <div className="text-[11px] text-slate-400">
                            Replaced by Standby {standbyReplacementBus.bus_number}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned (Standby Reserve)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {subDriver ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-black">
                              TEMP SUB
                            </span>
                            <span>{subDriver.profile?.name || subDriver.employee_id}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Regular: <span className="text-slate-300 font-semibold">{primaryDriver?.profile?.name || 'Unassigned'}</span> (Allocated until revert)
                          </div>
                          {onRevertSubstituteDriver && (
                            <button
                              onClick={() => onRevertSubstituteDriver(bus.id)}
                              className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 underline flex items-center space-x-1 pt-0.5"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Revert to Regular Driver</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200 font-medium">
                          {primaryDriver?.profile?.name || 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-300">{bus.capacity} Seats</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        bus.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : bus.status === 'maintenance'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {bus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {isEditable ? (
                        <>
                          {/* Revert Driver Button if sub active */}
                          {subDriver && onRevertSubstituteDriver ? (
                            <button
                              onClick={() => onRevertSubstituteDriver(bus.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all"
                              title="Revert back to regular driver"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Revert Driver</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openSubstituteModal(bus)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
                              title="Substitute Driver for this bus"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Sub Driver</span>
                            </button>
                          )}

                          {/* Swap / Restore Bus Button */}
                          {bus.is_standby_replacement && bus.route_id && onRevertBusSwap ? (
                            <button
                              onClick={() => onRevertBusSwap(bus.route_id!)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-all"
                              title="Restore regular bus from maintenance"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Restore Bus</span>
                            </button>
                          ) : bus.swapped_with_bus_id && bus.original_route_id && onRevertBusSwap ? (
                            <button
                              onClick={() => onRevertBusSwap(bus.original_route_id!)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all"
                              title="Resume service with this regular bus"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Resume Bus</span>
                            </button>
                          ) : bus.route_id ? (
                            <button
                              onClick={() => openSwapModal(bus)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-all"
                              title="Swap vehicle for this route (e.g. maintenance)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Swap Bus</span>
                            </button>
                          ) : null}

                          <Link
                            to="/live"
                            className="inline-flex p-2 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600/30 border border-blue-500/20 bg-blue-500/10 transition-colors"
                            title="Track Live GPS Location"
                          >
                            <MapPin className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(bus)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            title="Edit Bus Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deactivate/Delete ${bus.bus_number}?`)) {
                                onDeleteBus(bus.id);
                              }
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Bus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to="/live"
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600/30 border border-blue-500/20 bg-blue-500/10 transition-colors text-xs font-bold"
                            title="Track Live GPS Location"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Live GPS</span>
                          </Link>
                          <span className="text-[11px] font-bold text-slate-500 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                            Read Only
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* REASSIGN / SUBSTITUTE DRIVER MODAL */}
      {isSubstituteModalOpen && substituteBus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Substitute Driver Allocation</h2>
                  <p className="text-xs text-slate-400">{substituteBus.bus_number} &bull; {substituteBus.registration_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubstituteModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubstitute} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Current Regular Driver:</span>
                <span className="text-sm font-bold text-slate-200">
                  {drivers.find(d => d.id === substituteBus.assigned_driver_id)?.profile?.name || 'No Regular Driver Assigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Substitute Driver to Deploy</label>
                <select
                  required
                  value={selectedSubDriverId}
                  onChange={(e) => setSelectedSubDriverId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Remove Substitute / Restore Regular Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.profile?.name || d.employee_id} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Reassignment</label>
                <input
                  type="text"
                  value={substituteReason}
                  onChange={(e) => setSubstituteReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Regular driver sick leave, shift change"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSubstituteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                >
                  Confirm Driver Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWAP / REPLACE BUS FOR ROUTE MODAL */}
      {isSwapModalOpen && swapCurrentBus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Route Bus Swap & Standby Dispatch</h2>
                  <p className="text-xs text-slate-400">Route: {routes.find(r => r.id === swapCurrentBus.route_id)?.route_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySwap} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Current Bus on Route:</span>
                <span className="text-sm font-bold text-slate-200">
                  {swapCurrentBus.bus_number} ({swapCurrentBus.registration_number})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Replacement / Standby Bus</label>
                <select
                  required
                  value={selectedReplacementBusId}
                  onChange={(e) => setSelectedReplacementBusId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Alternate Vehicle --</option>
                  {buses.filter(b => b.id !== swapCurrentBus.id).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} &bull; {b.registration_number} ({b.capacity} Seats - {b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Swap Reason</label>
                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Bus breakdown, puncture, emergency maintenance"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Confirm Vehicle Swap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Bus Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingBus ? 'Edit Bus Configuration' : 'Register New College Bus'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="BUS-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Registration Reg No.</label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="TN 84 AX 1001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bus Name / Label</label>
                <input
                  type="text"
                  required
                  value={busName}
                  onChange={(e) => setBusName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  placeholder="Rajapalayam Deluxe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bus Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Route</label>
                  <select
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.route_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Driver</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.profile?.name || d.employee_id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30"
                >
                  Save Bus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
