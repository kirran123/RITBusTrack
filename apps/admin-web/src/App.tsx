import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ProfileModal } from './components/ProfileModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveTracking } from './pages/LiveTracking';
import { Buses } from './pages/Buses';
import { Drivers } from './pages/Drivers';
import { Students } from './pages/Students';
import { Routes as RoutesPage } from './pages/Routes';
import { Staff as StaffPage } from './pages/Staff';
import { Trips } from './pages/Trips';
import { Emergency } from './pages/Emergency';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';

import { 
  UserProfile, Bus, Driver, Student, Route as RouteType, Stop, Trip, CurrentBusLocation, EmergencyAlert, SystemNotification, StaffUser, StaffCommuter, SIMULATION_ROUTE_A
} from '@college-bus/shared';

import {
  INITIAL_BUSES, INITIAL_DRIVERS, INITIAL_STUDENTS, INITIAL_ROUTES, INITIAL_STOPS, INITIAL_TRIPS, INITIAL_LOCATIONS, INITIAL_EMERGENCIES, INITIAL_NOTIFICATIONS, INITIAL_STAFF, INITIAL_STAFF_COMMUTERS
} from './services/mockDataStore';
import { supabase } from './services/supabaseClient';

const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const saveStorage = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Storage save failed for', key, err);
  }
};

export const App: React.FC = () => {
  // Authentication State: Persisted in localStorage so reloading stays logged in
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadStorage<UserProfile | null>('bustrack_auth_user', null));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Persistent System Central State (Synced to localStorage and Supabase)
  const [buses, setBuses] = useState<Bus[]>(() => loadStorage('bustrack_buses_v1', INITIAL_BUSES));
  const [drivers, setDrivers] = useState<Driver[]>(() => loadStorage('bustrack_drivers_v1', INITIAL_DRIVERS));
  const [students, setStudents] = useState<Student[]>(() => loadStorage('bustrack_students_v1', INITIAL_STUDENTS));
  const [staffCommuters, setStaffCommuters] = useState<StaffCommuter[]>(() => loadStorage('bustrack_staff_commuters_v1', INITIAL_STAFF_COMMUTERS));
  const [routes, setRoutes] = useState<RouteType[]>(() => loadStorage('bustrack_routes_v1', INITIAL_ROUTES));
  const [stops, setStops] = useState<Stop[]>(() => loadStorage('bustrack_stops_v1', INITIAL_STOPS));
  const [trips, setTrips] = useState<Trip[]>(() => loadStorage('bustrack_trips_v1', INITIAL_TRIPS));
  const [locations, setLocations] = useState<CurrentBusLocation[]>(() => loadStorage('bustrack_locations_v1', INITIAL_LOCATIONS));
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>(() => loadStorage('bustrack_emergencies_v1', INITIAL_EMERGENCIES));
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => loadStorage('bustrack_notifications_v1', INITIAL_NOTIFICATIONS));
  const [staffList, setStaffList] = useState<StaffUser[]>(() => loadStorage('bustrack_staff_v1', INITIAL_STAFF));

  // Auto-Save Effect Watchers (Preserves all state & auth across page reloads)
  useEffect(() => {
    if (currentUser) {
      saveStorage('bustrack_auth_user', currentUser);
    } else {
      localStorage.removeItem('bustrack_auth_user');
    }
  }, [currentUser]);
  useEffect(() => saveStorage('bustrack_buses_v1', buses), [buses]);
  useEffect(() => saveStorage('bustrack_drivers_v1', drivers), [drivers]);
  useEffect(() => saveStorage('bustrack_students_v1', students), [students]);
  useEffect(() => saveStorage('bustrack_staff_commuters_v1', staffCommuters), [staffCommuters]);
  useEffect(() => saveStorage('bustrack_routes_v1', routes), [routes]);
  useEffect(() => saveStorage('bustrack_stops_v1', stops), [stops]);
  useEffect(() => saveStorage('bustrack_staff_v1', staffList), [staffList]);
  useEffect(() => saveStorage('bustrack_emergencies_v1', emergencies), [emergencies]);
  useEffect(() => saveStorage('bustrack_notifications_v1', notifications), [notifications]);

  // Cross-Tab / Cross-Window Broadcast Channel for instant local sync
  const [lastLiveBroadcastTime, setLastLiveBroadcastTime] = useState<number>(0);

  // Helper to trigger Super Admin & Admin Staff emergency notifications + audible alarm + desktop push
  const triggerEmergencySOSAlert = (payload: any) => {
    if (!payload) return;

    // 1. Update Emergencies list (avoid duplicate IDs)
    setEmergencies(prev => {
      const exists = prev.some(e => e.id === payload.id);
      if (exists) {
        return prev.map(e => e.id === payload.id ? { ...e, ...payload } : e);
      }
      return [payload, ...prev];
    });

    // 2. Add high-priority unread SystemNotification for Super Admin and Staff
    const busLabel = payload.bus_id === 'b1' ? 'BUS-01 (TN 67 AM 9785)' : (payload.bus?.bus_number || payload.bus_id || 'BUS-01');
    const sosNotif: SystemNotification = {
      id: 'notif_sos_' + Date.now(),
      title: `🚨 CRITICAL EMERGENCY SOS: ${busLabel}`,
      message: `${payload.type ? payload.type.toUpperCase() : 'DISTRESS ALERT'}: ${payload.message || 'Distress SOS dispatched by driver Mr. B. Moorthi.'}`,
      type: 'emergency',
      priority: 'high',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [sosNotif, ...prev]);

    // 3. Desktop / Browser Push Notification for Admin Staff & Super Admin
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 CRITICAL EMERGENCY SOS: ${busLabel}`, {
          body: `${payload.type ? payload.type.toUpperCase() : 'EMERGENCY'}: ${payload.message || 'Driver dispatched emergency SOS distress signal.'}`,
          icon: '/favicon.ico',
          tag: 'emergency_sos',
        });
      } catch (notifErr) {
        console.warn('Desktop notification error:', notifErr);
      }
    }

    // 4. Web Audio Audible Alarm Chime
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15); // A4
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      }
    } catch {}
  };

  // Request browser desktop notification permission on mount for Super Admin & Staff
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let crossChannel: any = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        crossChannel = new BroadcastChannel('bustrack_cross_client_sync');
        crossChannel.onmessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data || !data.type) return;

          if (data.type === 'location_update') {
            const payload = data.payload;
            if (!payload || !payload.busId || !payload.coordinate) return;
            setLastLiveBroadcastTime(Date.now());
            setLocations(prev => {
              const existingIdx = prev.findIndex(l => l.bus_id === payload.busId);
              const updatedLoc: CurrentBusLocation = {
                id: 'loc_' + payload.busId,
                bus_id: payload.busId,
                trip_id: payload.tripId,
                latitude: payload.coordinate.latitude,
                longitude: payload.coordinate.longitude,
                speed: payload.coordinate.speed || 0,
                heading: payload.coordinate.heading || 0,
                updated_at: new Date().toISOString()
              };
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = updatedLoc;
                return copy;
              }
              return [...prev, updatedLoc];
            });
          } else if (data.type === 'leave_toggle') {
            const { studentId, isOnLeave } = data.payload;
            setStudents(prev => {
              const updated = prev.map(s =>
                s.id === studentId ||
                s.user_id === studentId ||
                s.register_number === studentId ||
                (s.profile && (s.profile.id === studentId || s.profile.name === 'Kishore ST'))
                  ? { ...s, is_on_leave: isOnLeave, leave_date: isOnLeave ? new Date().toISOString().split('T')[0] : undefined }
                  : s
              );
              saveStorage('bustrack_students_v1', updated);
              return updated;
            });
          } else if (data.type === 'emergency_sos') {
            triggerEmergencySOSAlert(data.payload);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel setup note:', err);
      }
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'bustrack_students_v1' && e.newValue) {
        try {
          const freshStudents = JSON.parse(e.newValue);
          if (Array.isArray(freshStudents)) {
            setStudents(freshStudents);
          }
        } catch {}
      }

      if (e.key === 'bustrack_cross_sync_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'location_update') {
            const payload = data.payload;
            if (!payload || !payload.busId || !payload.coordinate) return;
            setLastLiveBroadcastTime(Date.now());
            setLocations(prev => {
              const existingIdx = prev.findIndex(l => l.bus_id === payload.busId);
              const updatedLoc: CurrentBusLocation = {
                id: 'loc_' + payload.busId,
                bus_id: payload.busId,
                trip_id: payload.tripId,
                latitude: payload.coordinate.latitude,
                longitude: payload.coordinate.longitude,
                speed: payload.coordinate.speed || 0,
                heading: payload.coordinate.heading || 0,
                updated_at: new Date().toISOString()
              };
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = updatedLoc;
                return copy;
              }
              return [...prev, updatedLoc];
            });
          } else if (data.type === 'leave_toggle') {
            const { studentId, isOnLeave } = data.payload;
            setStudents(prev => {
              const updated = prev.map(s =>
                s.id === studentId ||
                s.user_id === studentId ||
                s.register_number === studentId ||
                (s.profile && (s.profile.id === studentId || s.profile.name === 'Kishore ST'))
                  ? { ...s, is_on_leave: isOnLeave, leave_date: isOnLeave ? new Date().toISOString().split('T')[0] : undefined }
                  : s
              );
              saveStorage('bustrack_students_v1', updated);
              return updated;
            });
          } else if (data.type === 'emergency_sos') {
            triggerEmergencySOSAlert(data.payload);
          }
        } catch {}
      }
    };

    const handleFocus = () => {
      const fresh = loadStorage<Student[] | null>('bustrack_students_v1', null);
      if (fresh && Array.isArray(fresh)) {
        setStudents(fresh);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (crossChannel) crossChannel.close();
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Supabase Realtime Live GPS Synchronization with Mobile Driver App
  useEffect(() => {
    if (!supabase) return;

    try {
      const channel = supabase.channel('bus_tracking_live', {
        config: { broadcast: { self: true } }
      });

      channel
        .on('broadcast', { event: 'location_update' }, ({ payload }: any) => {
          if (!payload || !payload.busId || !payload.coordinate) return;
          setLastLiveBroadcastTime(Date.now());

          setLocations(prev => {
            const existingIdx = prev.findIndex(l => l.bus_id === payload.busId);
            const updatedLoc: CurrentBusLocation = {
              id: 'loc_' + payload.busId,
              bus_id: payload.busId,
              trip_id: payload.tripId,
              latitude: payload.coordinate.latitude,
              longitude: payload.coordinate.longitude,
              speed: payload.coordinate.speed || 0,
              heading: payload.coordinate.heading || 0,
              updated_at: new Date().toISOString()
            };

            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = updatedLoc;
              return copy;
            }
            return [...prev, updatedLoc];
          });
        })
        .on('broadcast', { event: 'emergency_sos' }, ({ payload }: any) => {
          triggerEmergencySOSAlert(payload);
        })
        .on('broadcast', { event: 'leave_toggle' }, ({ payload }: any) => {
          if (!payload || !payload.studentId) return;
          setStudents(prev => prev.map(s => s.id === payload.studentId ? { ...s, is_on_leave: payload.isOnLeave } : s));
        })
        .subscribe((status) => {
          console.log('📡 Supabase Live GPS Channel Status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }, []);

  // Live Simulation Timer for Demo Mode (Pauses when live mobile app driver is actively transmitting!)
  useEffect(() => {
    let simIndex = 0;
    const timer = setInterval(() => {
      // If mobile driver is broadcasting live GPS, don't overwrite with mock simulation
      if (Date.now() - lastLiveBroadcastTime < 25000) {
        return;
      }

      simIndex = (simIndex + 1) % SIMULATION_ROUTE_A.length;
      const point = SIMULATION_ROUTE_A[simIndex];

      setLocations(prev => prev.map(loc => {
        if (loc.bus_id === 'b1') {
          return {
            ...loc,
            latitude: point.latitude,
            longitude: point.longitude,
            speed: point.speed || 30,
            updated_at: new Date().toISOString()
          };
        }
        return loc;
      }));
    }, 4000);

    return () => clearInterval(timer);
  }, [lastLiveBroadcastTime]);

  // CRUD Handlers
  const handleSaveBus = (bus: Bus) => {
    setBuses(prev => {
      const idx = prev.findIndex(b => b.id === bus.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = bus;
        return copy;
      }
      return [...prev, bus];
    });

    // Bidirectionally sync with drivers state
    if (bus.assigned_driver_id) {
      setDrivers(prev => prev.map(d => {
        if (d.id === bus.assigned_driver_id) {
          return { ...d, assigned_bus_id: bus.id };
        }
        if (d.assigned_bus_id === bus.id && d.id !== bus.assigned_driver_id) {
          return { ...d, assigned_bus_id: null };
        }
        return d;
      }));
    } else {
      setDrivers(prev => prev.map(d => {
        if (d.assigned_bus_id === bus.id) {
          return { ...d, assigned_bus_id: null };
        }
        return d;
      }));
    }

    // Automatically sync live GPS location entry so newly created buses appear immediately on the map!
    setLocations(prev => {
      const existingIdx = prev.findIndex(l => l.bus_id === bus.id);
      const routeStops = stops.filter(s => s.route_id === bus.route_id).sort((a, b) => a.stop_order - b.stop_order);
      const startLat = routeStops[0]?.latitude || (9.4475 + ((prev.length + 1) * 0.003));
      const startLng = routeStops[0]?.longitude || (77.5450 + ((prev.length + 1) * 0.0025));

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          bus
        };
        return copy;
      }

      const newLocation: CurrentBusLocation = {
        id: 'loc_' + bus.id,
        bus_id: bus.id,
        trip_id: 'trip_' + bus.id,
        latitude: startLat,
        longitude: startLng,
        speed: 28.0,
        heading: 55,
        accuracy: 3.5,
        updated_at: new Date().toISOString(),
        bus: bus
      };
      return [...prev, newLocation];
    });

    if (supabase) {
      try {
        supabase.from('buses').upsert({
          id: bus.id,
          bus_number: bus.bus_number,
          registration_number: bus.registration_number,
          bus_name: bus.bus_name,
          capacity: bus.capacity,
          route_id: bus.route_id || null,
          assigned_driver_id: bus.assigned_driver_id || null,
          status: bus.status
        }).catch(() => {});
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleDeleteBus = (busId: string) => {
    setBuses(prev => prev.filter(b => b.id !== busId));
    setLocations(prev => prev.filter(l => l.bus_id !== busId));
    setDrivers(prev => prev.map(d => {
      if (d.assigned_bus_id === busId) {
        return { ...d, assigned_bus_id: null };
      }
      return d;
    }));

    if (supabase) {
      try {
        supabase.from('buses').delete().eq('id', busId).catch(() => {});
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleSaveDriver = (driver: Driver) => {
    setDrivers(prev => {
      const idx = prev.findIndex(d => d.id === driver.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = driver;
        return copy;
      }
      return [...prev, driver];
    });

    // Bidirectionally synchronize with buses state so assigning from Driver Management reflects in Bus Management!
    if (driver.assigned_bus_id) {
      setBuses(prev => prev.map(b => {
        if (b.id === driver.assigned_bus_id) {
          return {
            ...b,
            assigned_driver_id: driver.id,
            driver: driver
          };
        }
        if (b.assigned_driver_id === driver.id && b.id !== driver.assigned_bus_id) {
          return {
            ...b,
            assigned_driver_id: null,
            driver: undefined
          };
        }
        return b;
      }));
    } else {
      setBuses(prev => prev.map(b => {
        if (b.assigned_driver_id === driver.id) {
          return {
            ...b,
            assigned_driver_id: null,
            driver: undefined
          };
        }
        return b;
      }));
    }

    if (supabase) {
      try {
        supabase.from('drivers').upsert({
          id: driver.id,
          employee_id: driver.employee_id,
          license_number: driver.license_number,
          phone: driver.phone,
          assigned_bus_id: driver.assigned_bus_id || null,
          status: driver.status
        }).catch(() => {});
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers(prev => prev.filter(d => d.id !== driverId));
    setBuses(prev => prev.map(b => {
      if (b.assigned_driver_id === driverId) {
        return { ...b, assigned_driver_id: null, driver: undefined };
      }
      return b;
    }));

    if (supabase) {
      try {
        supabase.from('drivers').delete().eq('id', driverId).catch(() => {});
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleSaveStudent = (student: Student) => {
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === student.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = student;
        return copy;
      }
      return [...prev, student];
    });
  };

  const handleToggleStudentLeave = (studentId: string) => {
    let nextState = false;
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        nextState = !s.is_on_leave;
        return {
          ...s,
          is_on_leave: nextState,
          leave_date: nextState ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return s;
    }));

    // Broadcast across BroadcastChannel & localStorage
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('bustrack_cross_client_sync');
        bc.postMessage({ type: 'leave_toggle', payload: { studentId, isOnLeave: nextState } });
        bc.close();
      }
      localStorage.setItem('bustrack_cross_sync_event', JSON.stringify({ type: 'leave_toggle', payload: { studentId, isOnLeave: nextState }, timestamp: Date.now() }));
    } catch {}

    if (supabase) {
      try {
        const channel = supabase.channel('bus_tracking_live');
        channel.send({
          type: 'broadcast',
          event: 'leave_toggle',
          payload: { studentId, isOnLeave: nextState }
        }).catch(() => {});
        supabase.from('students').update({ is_on_leave: nextState }).eq('id', studentId).catch(() => {});
      } catch {}
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleUpdateStudentPassword = (studentId: string, newPass: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, password: newPass } : s));
  };

  const handleImportStudentsCSV = (newStudents: Student[]) => {
    setStudents(prev => [...prev, ...newStudents]);
  };

  // Staff Commuters (Faculty & Staff Bus Passengers) Handlers
  const handleSaveStaffCommuter = (commuter: StaffCommuter) => {
    setStaffCommuters(prev => {
      const idx = prev.findIndex(c => c.id === commuter.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = commuter;
        return copy;
      }
      return [...prev, commuter];
    });
  };

  const handleDeleteStaffCommuter = (commuterId: string) => {
    setStaffCommuters(prev => prev.filter(c => c.id !== commuterId));
  };

  const handleToggleStaffCommuterLeave = (commuterId: string) => {
    let nextState = false;
    setStaffCommuters(prev => prev.map(c => {
      if (c.id === commuterId) {
        nextState = !c.is_on_leave;
        return {
          ...c,
          is_on_leave: nextState,
          leave_date: nextState ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return c;
    }));

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('bustrack_cross_client_sync');
        bc.postMessage({ type: 'staff_leave_toggle', payload: { commuterId, isOnLeave: nextState } });
        bc.close();
      }
      localStorage.setItem('bustrack_cross_sync_event', JSON.stringify({ type: 'staff_leave_toggle', payload: { commuterId, isOnLeave: nextState }, timestamp: Date.now() }));
    } catch {}
  };

  const handleUpdateStaffCommuterPassword = (commuterId: string, newPass: string) => {
    setStaffCommuters(prev => prev.map(c => c.id === commuterId ? { ...c, password: newPass } : c));
  };

  const handleImportStaffCommutersCSV = (imported: StaffCommuter[]) => {
    setStaffCommuters(prev => [...prev, ...imported]);
  };

  const handleSubstituteDriver = (busId: string, substituteDriverId: string, reason?: string) => {
    const targetBus = buses.find(b => b.id === busId);
    const subDriver = drivers.find(d => d.id === substituteDriverId);
    const regularDriver = drivers.find(d => d.id === targetBus?.assigned_driver_id);

    setBuses(prev => prev.map(b => {
      if (b.id === busId) {
        return {
          ...b,
          substitute_driver_id: substituteDriverId || null,
          substitute_driver: subDriver || null,
          substitution_reason: substituteDriverId ? (reason || 'Regular driver temporary leave') : null,
          substitution_date: substituteDriverId ? new Date().toISOString() : null,
          driver: subDriver || regularDriver || b.driver
        };
      }
      return b;
    }));

    // Generate System Notification for Super Admin, Admin Staff, Students & Staff Commuters
    const title = substituteDriverId
      ? `👨‍✈️ Driver Update: ${targetBus?.bus_number || 'Bus'}`
      : `👨‍✈️ Regular Driver Restored: ${targetBus?.bus_number || 'Bus'}`;
    const message = substituteDriverId
      ? `Substitute driver ${subDriver?.profile?.name || 'Substitute Driver'} (${subDriver?.profile?.phone || '+91 91234 56781'}) is operating ${targetBus?.bus_number} today. Reason: ${reason || 'Regular driver emergency leave'}. (Original Driver: ${regularDriver?.profile?.name || 'Regular Driver'})`
      : `Regular driver ${regularDriver?.profile?.name || 'Regular Driver'} has resumed duties for ${targetBus?.bus_number}.`;

    const newNotification: SystemNotification = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type: 'route_change',
      target_role: 'all',
      bus_id: busId,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);

    // Broadcast across Supabase Realtime channel to all connected Student & Staff mobile apps
    if (supabase) {
      try {
        const channel = supabase.channel('bus_tracking_live');
        channel.send({
          type: 'broadcast',
          event: 'fleet_swap_notice',
          payload: {
            id: newNotification.id,
            type: 'driver_swap',
            title,
            message,
            busId,
            busNumber: targetBus?.bus_number || 'BUS-01',
            originalDriverName: regularDriver?.profile?.name,
            substituteDriverName: subDriver?.profile?.name,
            substituteDriverPhone: subDriver?.profile?.phone || '+91 91234 56781',
            reason: reason || 'Driver emergency leave',
            timestamp: new Date().toISOString(),
          }
        }).catch(() => {});
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleRevertSubstituteDriver = (busId: string) => {
    handleSubstituteDriver(busId, '', 'Regular driver resumed duties');
  };

  const handleSwapBus = (routeId: string, newBusId: string, reason?: string) => {
    const targetRoute = routes.find(r => r.id === routeId);
    const oldBus = buses.find(b => b.route_id === routeId);
    const newBus = buses.find(b => b.id === newBusId);

    setBuses(prev => prev.map(b => {
      if (b.route_id === routeId && b.id !== newBusId) {
        // Mark regular bus as temporarily swapped out
        return {
          ...b,
          route_id: null,
          status: 'maintenance',
          is_standby_replacement: false,
          swapped_with_bus_id: newBusId,
          original_route_id: routeId,
        };
      }
      if (b.id === newBusId) {
        // Assign standby bus to this route with reference to regular bus
        return {
          ...b,
          route_id: routeId,
          is_standby_replacement: true,
          original_bus_id: oldBus?.id || null,
          substitution_reason: reason || 'Vehicle maintenance / standby swap',
          substitution_date: new Date().toISOString(),
          status: 'active',
        };
      }
      return b;
    }));

    // Re-route student allocations to new bus number
    if (newBus) {
      setStudents(prev => prev.map(st => {
        if (st.route_id === routeId) {
          return {
            ...st,
            bus_id: newBus.id,
            bus: newBus
          };
        }
        return st;
      }));
    }

    // Generate System Notification for Super Admin, Admin Staff, Students & Staff Commuters
    const title = `🔄 Standby Vehicle Swap: ${targetRoute?.route_name || 'Route'}`;
    const message = `Standby Bus ${newBus?.bus_number} (${newBus?.registration_number}) is deployed on ${targetRoute?.route_name}. Regular Bus ${oldBus?.bus_number || 'BUS'} is under maintenance. Reason: ${reason || 'Emergency maintenance'}`;

    const newNotification: SystemNotification = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type: 'route_change',
      target_role: 'all',
      bus_id: newBusId,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);

    // Broadcast across Supabase Realtime channel to all connected Student & Staff mobile apps
    if (supabase) {
      try {
        const channel = supabase.channel('bus_tracking_live');
        channel.send({
          type: 'broadcast',
          event: 'fleet_swap_notice',
          payload: {
            id: newNotification.id,
            type: 'bus_swap',
            title,
            message,
            busId: newBusId,
            busNumber: newBus?.bus_number || 'BUS-02',
            originalBusNumber: oldBus?.bus_number || 'BUS-01',
            replacementBusNumber: newBus?.bus_number || 'BUS-02',
            replacementRegistrationNumber: newBus?.registration_number,
            reason: reason || 'Vehicle maintenance',
            timestamp: new Date().toISOString(),
          }
        }).catch(() => {});
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleRevertBusSwap = (routeId: string) => {
    const targetRoute = routes.find(r => r.id === routeId);
    const standbyBus = buses.find(b => b.route_id === routeId && b.is_standby_replacement);
    const originalBus = buses.find(b => b.original_route_id === routeId || b.id === standbyBus?.original_bus_id);

    if (!originalBus) return;

    setBuses(prev => prev.map(b => {
      if (b.id === originalBus.id) {
        // Restore regular bus
        return {
          ...b,
          route_id: routeId,
          status: 'active',
          is_standby_replacement: false,
          swapped_with_bus_id: null,
          original_route_id: null,
        };
      }
      if (standbyBus && b.id === standbyBus.id) {
        // Reset standby bus back to reserve
        return {
          ...b,
          route_id: null,
          is_standby_replacement: false,
          original_bus_id: null,
          substitution_reason: null,
          substitution_date: null,
          status: 'active',
        };
      }
      return b;
    }));

    // Re-link students to restored regular bus
    setStudents(prev => prev.map(st => {
      if (st.route_id === routeId) {
        return {
          ...st,
          bus_id: originalBus.id,
          bus: originalBus
        };
      }
      return st;
    }));

    // Notification
    const title = `🚌 Regular Bus Restored: ${targetRoute?.route_name || 'Route'}`;
    const message = `Regular Bus ${originalBus.bus_number} has returned from maintenance and resumed service on ${targetRoute?.route_name}. Standby Bus ${standbyBus?.bus_number || ''} returned to reserve.`;

    const newNotification: SystemNotification = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type: 'route_change',
      target_role: 'all',
      bus_id: originalBus.id,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);

    if (supabase) {
      try {
        const channel = supabase.channel('bus_tracking_live');
        channel.send({
          type: 'broadcast',
          event: 'fleet_swap_notice',
          payload: {
            id: newNotification.id,
            type: 'bus_swap_revert',
            title,
            message,
            busId: originalBus.id,
            busNumber: originalBus.bus_number,
            timestamp: new Date().toISOString(),
          }
        }).catch(() => {});
      } catch (err) {}
    }
  };

  const handleSaveRoute = async (route: RouteType) => {
    setRoutes(prev => {
      const idx = prev.findIndex(r => r.id === route.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = route;
        return copy;
      }
      return [...prev, route];
    });

    if (supabase) {
      try {
        await supabase.from('routes').upsert({
          id: route.id,
          route_name: route.route_name,
          start_location: route.start_location,
          destination: route.destination,
          distance_km: route.distance_km,
          estimated_duration: route.estimated_duration,
          status: route.status || 'active'
        });
      } catch (e) {
        console.warn('Supabase route sync note:', e);
      }
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    setStops(prev => prev.filter(s => s.route_id !== routeId));

    if (supabase) {
      try {
        await supabase.from('routes').delete().eq('id', routeId);
      } catch (e) {
        console.warn('Supabase route delete note:', e);
      }
    }
  };

  const handleSaveStop = async (stop: Stop) => {
    setStops(prev => {
      const idx = prev.findIndex(s => s.id === stop.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = stop;
        return copy;
      }
      return [...prev, stop];
    });

    if (supabase) {
      try {
        await supabase.from('stops').upsert({
          id: stop.id,
          route_id: stop.route_id,
          stop_name: stop.stop_name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          stop_order: stop.stop_order,
          estimated_arrival: stop.estimated_arrival,
          status: stop.status || 'active'
        });
      } catch (e) {
        console.warn('Supabase stop sync note:', e);
      }
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    setStops(prev => prev.filter(s => s.id !== stopId));

    if (supabase) {
      try {
        await supabase.from('stops').delete().eq('id', stopId);
      } catch (e) {
        console.warn('Supabase stop delete note:', e);
      }
    }
  };

  const handleReorderStops = async (routeId: string, newRouteStops: Stop[]) => {
    const reindexed = newRouteStops.map((s, idx) => ({ ...s, stop_order: idx + 1 }));
    setStops(prev => {
      const otherStops = prev.filter(s => s.route_id !== routeId);
      return [...otherStops, ...reindexed];
    });

    if (supabase) {
      try {
        for (const st of reindexed) {
          await supabase.from('stops').upsert({
            id: st.id,
            route_id: st.route_id,
            stop_name: st.stop_name,
            latitude: st.latitude,
            longitude: st.longitude,
            stop_order: st.stop_order,
            estimated_arrival: st.estimated_arrival,
            status: st.status || 'active'
          });
        }
      } catch (e) {
        console.warn('Supabase stop reorder sync note:', e);
      }
    }
  };

  // Staff Management Handlers
  const handleSaveStaff = (staff: StaffUser) => {
    setStaffList(prev => {
      const idx = prev.findIndex(s => s.id === staff.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = staff;
        return copy;
      }
      return [...prev, staff];
    });
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
  };

  const handleToggleStaffAccess = (staffId: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === staffId) {
        const nextAccess = s.access_level === 'edit' ? 'view' : 'edit';
        return { ...s, access_level: nextAccess };
      }
      return s;
    }));
  };

  const handleUpdateStaffPassword = (staffId: string, newPass: string) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, password: newPass } : s));
  };

  const handleSimulateLoginAsStaff = (staff: StaffUser) => {
    setCurrentUser({
      id: staff.id,
      auth_user_id: staff.auth_user_id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: 'staff',
      access_level: staff.access_level,
      status: staff.status
    });
  };

  const handleAcknowledgeEmergency = (id: string) => {
    setEmergencies(prev => prev.map(e => e.id === id ? { ...e, status: 'ACKNOWLEDGED' } : e));
  };

  const handleResolveEmergency = (id: string) => {
    setEmergencies(prev => prev.map(e => e.id === id ? { ...e, status: 'RESOLVED', resolved_at: new Date().toISOString() } : e));
  };

  const handleSendNotification = (notification: SystemNotification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
  };

  const activeEmergenciesCount = emergencies.filter(e => e.status === 'ACTIVE').length;

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} staffList={staffList} />;
  }

  // Role-Based Edit Permission: Super Admin or Staff with Edit access level
  const canEdit = currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit');

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white">
        
        {/* Modern Sidebar (Desktop + Mobile overlay) */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeEmergenciesCount={activeEmergenciesCount}
          onOpenProfile={() => setIsProfileOpen(true)}
          currentUser={currentUser}
          onLogout={() => setCurrentUser(null)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 h-screen overflow-hidden">
          {/* Top Navigation Bar */}
          <Navbar
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            user={currentUser}
            currentUser={currentUser}
            onLogout={() => setCurrentUser(null)}
            activeEmergenciesCount={activeEmergenciesCount}
            notifications={notifications}
            onClearNotifications={handleClearAllNotifications}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
            onDismissNotification={handleDeleteNotification}
          />

          {/* Scrollable Viewport Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
              <Routes>
              <Route path="/" element={
                <ErrorBoundary fallbackTitle="Dashboard Operations">
                  <Dashboard
                    buses={buses}
                    drivers={drivers}
                    students={students}
                    routes={routes}
                    stops={stops}
                    trips={trips}
                    locations={locations}
                    emergencies={emergencies}
                    onToggleStudentLeave={handleToggleStudentLeave}
                    onSubstituteDriver={handleSubstituteDriver}
                    onSwapBus={handleSwapBus}
                    onRevertSubstituteDriver={handleRevertSubstituteDriver}
                    onRevertBusSwap={handleRevertBusSwap}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/live" element={
                <ErrorBoundary fallbackTitle="Live Fleet Radar & Command Center">
                  <LiveTracking
                    locations={locations}
                    routes={routes}
                    stops={stops}
                    buses={buses}
                    drivers={drivers}
                    students={students}
                    onToggleStudentLeave={handleToggleStudentLeave}
                    onSaveBus={handleSaveBus}
                    onSaveDriver={handleSaveDriver}
                    onSaveStudent={handleSaveStudent}
                    onSaveRoute={handleSaveRoute}
                    onSaveStop={handleSaveStop}
                    onDeleteStop={handleDeleteStop}
                    onReorderStops={handleReorderStops}
                    onSubstituteDriver={handleSubstituteDriver}
                    onSwapBus={handleSwapBus}
                    onRevertSubstituteDriver={handleRevertSubstituteDriver}
                    onRevertBusSwap={handleRevertBusSwap}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/buses" element={
                <ErrorBoundary fallbackTitle="Fleet Management">
                  <Buses
                    buses={buses}
                    drivers={drivers}
                    routes={routes}
                    onSaveBus={handleSaveBus}
                    onDeleteBus={handleDeleteBus}
                    onSubstituteDriver={handleSubstituteDriver}
                    onSwapBus={handleSwapBus}
                    onRevertSubstituteDriver={handleRevertSubstituteDriver}
                    onRevertBusSwap={handleRevertBusSwap}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/drivers" element={
                <ErrorBoundary fallbackTitle="Driver Operations">
                  <Drivers
                    drivers={drivers}
                    buses={buses}
                    onSaveDriver={handleSaveDriver}
                    onDeleteDriver={handleDeleteDriver}
                    onSubstituteDriver={handleSubstituteDriver}
                    onRevertSubstituteDriver={handleRevertSubstituteDriver}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/routes" element={
                <ErrorBoundary fallbackTitle="Routes & Stops Management">
                  <RoutesPage
                    routes={routes}
                    stops={stops}
                    buses={buses}
                    drivers={drivers}
                    onSaveRoute={handleSaveRoute}
                    onDeleteRoute={handleDeleteRoute}
                    onSaveStop={handleSaveStop}
                    onDeleteStop={handleDeleteStop}
                    onReorderStops={handleReorderStops}
                    onSubstituteDriver={handleSubstituteDriver}
                    onSwapBus={handleSwapBus}
                    onRevertSubstituteDriver={handleRevertSubstituteDriver}
                    onRevertBusSwap={handleRevertBusSwap}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/students" element={
                <ErrorBoundary fallbackTitle="Student Pass Directory">
                  <Students
                    students={students}
                    buses={buses}
                    routes={routes}
                    stops={stops}
                    onSaveStudent={handleSaveStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onImportCSV={handleImportStudentsCSV}
                    onToggleStudentLeave={handleToggleStudentLeave}
                    onUpdateStudentPassword={handleUpdateStudentPassword}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              {/* Staff Management (Faculty Commuters & Web Staff Control) */}
              <Route path="/staff" element={
                <ErrorBoundary fallbackTitle="Staff Management">
                  <StaffPage
                    currentUser={currentUser}
                    canEdit={canEdit}
                    staffList={staffList}
                    staffCommuters={staffCommuters}
                    buses={buses}
                    routes={routes}
                    stops={stops}
                    onSaveStaff={handleSaveStaff}
                    onDeleteStaff={handleDeleteStaff}
                    onToggleStaffAccess={handleToggleStaffAccess}
                    onUpdateStaffPassword={handleUpdateStaffPassword}
                    onSimulateLoginAsStaff={handleSimulateLoginAsStaff}
                    onSaveStaffCommuter={handleSaveStaffCommuter}
                    onDeleteStaffCommuter={handleDeleteStaffCommuter}
                    onToggleStaffCommuterLeave={handleToggleStaffCommuterLeave}
                    onUpdateStaffCommuterPassword={handleUpdateStaffCommuterPassword}
                    onImportStaffCommuterCSV={handleImportStaffCommutersCSV}
                  />
                </ErrorBoundary>
              } />

              <Route path="/trips" element={
                <ErrorBoundary fallbackTitle="Trip Logs">
                  <Trips
                    trips={trips}
                    buses={buses}
                    drivers={drivers}
                    routes={routes}
                  />
                </ErrorBoundary>
              } />

              <Route path="/emergency" element={
                <ErrorBoundary fallbackTitle="Incident Command">
                  <Emergency
                    emergencies={emergencies}
                    onAcknowledge={handleAcknowledgeEmergency}
                    onResolve={handleResolveEmergency}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/notifications" element={
                <ErrorBoundary fallbackTitle="Broadcasts & Notification Center">
                  <Notifications
                    notifications={notifications}
                    routes={routes}
                    buses={buses}
                    onSendNotification={handleSendNotification}
                    onDeleteNotification={handleDeleteNotification}
                    onClearAll={handleClearAllNotifications}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              } />

              <Route path="/reports" element={
                <ErrorBoundary fallbackTitle="Reports & Analytics">
                  <Reports
                    trips={trips}
                    buses={buses}
                  />
                </ErrorBoundary>
              } />

              <Route path="/settings" element={
                <ErrorBoundary fallbackTitle="Settings">
                  <Settings />
                </ErrorBoundary>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Page Footer Credit */}
            <footer className="mt-12 pt-6 pb-6 border-t border-slate-800/80 text-center space-y-1">
              <p className="text-xs font-bold text-slate-400">
                Designed and Developed by <span className="text-blue-400 font-extrabold">Kirran S T</span>
              </p>
              <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
                Department of Information Technology &bull; Ramco Institute of Technology
              </p>
            </footer>
          </main>

          {/* Bottom Navigation for Modern Responsive App Experience */}
          <BottomNav
            activeEmergenciesCount={activeEmergenciesCount}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        </div>

        {/* Profile Modal */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          onLogout={() => setCurrentUser(null)}
          busesCount={buses.length}
          studentsCount={students.length}
          routesCount={routes.length}
        />
      </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
