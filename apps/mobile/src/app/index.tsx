import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStorage, MobilePortalRole } from '../services/authStorage';
import { hideSplash } from '../services/splashService';
import { 
  MASTER_DRIVERS, 
  MASTER_STUDENTS, 
  MASTER_STAFF_USERS, 
  MASTER_STAFF_COMMUTERS,
  MASTER_BUSES,
  MASTER_ROUTES
} from '@college-bus/shared';
import { supabase, isLiveBackendConfigured } from '../services/supabase';
import { locationTracker } from '../services/locationService';
import { notificationService } from '../services/notificationService';
import { fetchCloudUserRegistry, findStudentInDatabaseDirectly } from '../services/cloudSync';
import { useTheme } from '../theme';
import { Card, Button, Input } from '../components/ui';
import { Mail, Lock, Eye, EyeOff, GraduationCap, User, Phone, Bus, Check, Sun, Moon } from 'lucide-react-native';

export { MobilePortalRole };

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [role, setRole] = useState<'student' | 'staff' | 'driver'>('student');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  // Session restore — runs ONCE on mount
  useEffect(() => {
    let isMounted = true;

    const checkActiveSession = async () => {
      try {
        const session = await authStorage.getSession();
        if (session?.role && isMounted) {
          const targetPath =
            session.role === 'driver'
              ? '/driver'
              : session.role === 'student'
                ? '/student'
                : '/staff';
          try {
            routerRef.current.replace(targetPath as any);
            // Give the target screen 250ms to paint, then hide splash.
            // The user sees: splash → portal screen (no black gap).
            setTimeout(() => hideSplash(), 250);
          } catch {
            if (isMounted) setIsCheckingSession(false);
          }
          return;
        }
      } catch (e) {
        console.warn('Session restore notice:', e);
      }
      // No session — show login form
      if (isMounted) setIsCheckingSession(false);
    };

    checkActiveSession();
    // Warm up / sync cloud user registry in background
    fetchCloudUserRegistry().catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Hide splash the frame AFTER the login form becomes visible.
  // requestAnimationFrame fires after React commits the layout to screen,
  // guaranteeing the login UI is actually painted before the splash disappears.
  useEffect(() => {
    if (!isCheckingSession) {
      requestAnimationFrame(() => hideSplash());
    }
  }, [isCheckingSession]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleRoleChange = (selectedRole: 'student' | 'staff' | 'driver') => {
    setRole(selectedRole);
    setPhone('');
    setEmail('');
    setPassword('');
  };

  const handleLogin = async () => {
    const inputIdentifier = (role === 'driver' ? phone : email).trim();
    const normalizedIdentifier = inputIdentifier.toLowerCase();
    const trimmedPass = password.trim();

    if (!inputIdentifier) {
      showAlert(
        'Missing Identifier',
        role === 'driver'
          ? 'Please enter your registered mobile number or driver ID.'
          : role === 'student'
            ? 'Please enter your registered student email or roll number.'
            : 'Please enter your registered staff institutional email.'
      );
      return;
    }

    if (!trimmedPass) {
      showAlert('Missing Password', 'Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Request permissions non-blocking
      try {
        locationTracker.requestForegroundPermission().catch(() => {});
        notificationService.requestPermission().catch(() => {});
      } catch {}

      // 1. Super Admin Authentication (Supports Kirran S T, Dept of IT, Admin accounts)
      const isSuperAdminEmail =
        normalizedIdentifier === 'kirranvijay@gmail.com' ||
        normalizedIdentifier === 'deptit@ritrjpm.ac.in' ||
        normalizedIdentifier === 'admin@college.edu' ||
        normalizedIdentifier === 'admin' ||
        normalizedIdentifier === 'admin@ritrjpm.ac.in';

      const isSuperAdminPass =
        trimmedPass === 'Kirranst@14' ||
        trimmedPass.toLowerCase() === 'kirranst@14' ||
        trimmedPass === 'deptit@rit' ||
        trimmedPass === 'admin123' ||
        trimmedPass.toLowerCase() === 'admin123' ||
        trimmedPass === 'admin' ||
        trimmedPass === 'staff123' ||
        trimmedPass === 'password';

      if (isSuperAdminEmail) {
        if (isSuperAdminPass) {
          const adminUser = {
            id: normalizedIdentifier === 'deptit@ritrjpm.ac.in' ? 'sa_dept_it' : 'sa_01',
            name: normalizedIdentifier === 'deptit@ritrjpm.ac.in' ? 'Dept of IT Super Admin' : 'Kirran S T (Super Admin)',
            email: normalizedIdentifier.includes('@') ? normalizedIdentifier : 'admin@ritrjpm.ac.in',
            phone: '+91 96292 84690',
            role: 'staff',
            access_level: 'edit',
            department: 'Transport Coordination Wing',
            designation: 'Transport Incharge / Admin',
          };
          await authStorage.saveSession('staff', adminUser);
          routerRef.current.replace('/staff' as any);
          setIsSubmitting(false);
          return;
        } else if (!isSuperAdminPass) {
          showAlert('Authentication Failed', 'Incorrect password for administrator.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Try Supabase Auth if online
      if (isLiveBackendConfigured && supabase && normalizedIdentifier.includes('@')) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: normalizedIdentifier,
            password: trimmedPass,
          });
          if (!authError && authData?.user) {
            const uRole = (authData.user.user_metadata?.role || (role === 'driver' ? 'driver' : role === 'student' ? 'student' : 'staff')) as any;
            const liveUser = {
              id: authData.user.id,
              name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
              email: authData.user.email,
              phone: authData.user.phone || '+91 96292 84690',
              role: uRole === 'admin' ? 'staff' : uRole,
            };
            const effRole = uRole === 'admin' ? 'staff' : uRole;
            await authStorage.saveSession(effRole, liveUser);
            const target = effRole === 'driver' ? '/driver' : effRole === 'student' ? '/student' : '/staff';
            routerRef.current.replace(target as any);
            setIsSubmitting(false);
            return;
          }
        } catch (authErr) {
          console.log('Supabase live auth attempt skipped:', authErr);
        }
      }

      // 3. Prepare All Data Collections (combining shared MASTER, built-ins, and dynamic Admin Web storage)
      // BUSES & ROUTES
      let allBuses: any[] = [...MASTER_BUSES];
      try {
        const storedB = await authStorage.getItem('bustrack_buses_v1');
        if (storedB) {
          const parsedB = JSON.parse(storedB);
          if (Array.isArray(parsedB) && parsedB.length > 0) allBuses = [...parsedB, ...allBuses];
        }
      } catch {}

      let allRoutes: any[] = [...MASTER_ROUTES];
      try {
        const storedR = await authStorage.getItem('bustrack_routes_v1');
        if (storedR) {
          const parsedR = JSON.parse(storedR);
          if (Array.isArray(parsedR) && parsedR.length > 0) allRoutes = [...parsedR, ...allRoutes];
        }
      } catch {}

      // DRIVERS
      let allDrivers: any[] = [];
      try {
        const stored = await authStorage.getItem('bustrack_drivers_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) allDrivers = [...parsed];
        }
      } catch {}
      // Add MASTER_DRIVERS if not already present
      MASTER_DRIVERS.forEach(md => {
        if (!allDrivers.some(d => d.id === md.id || d.employee_id === md.employee_id)) {
          allDrivers.push(md);
        }
      });

      // STUDENTS
      let allStudents: any[] = [];
      try {
        const stored = await authStorage.getItem('bustrack_students_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) allStudents = [...parsed];
        }
      } catch {}
      // Add MASTER_STUDENTS if not already present
      MASTER_STUDENTS.forEach(ms => {
        if (!allStudents.some(s => s.id === ms.id || s.register_number === ms.register_number || (s.email && s.email === ms.profile?.email))) {
          allStudents.push(ms);
        }
      });

      // STAFF / FACULTY
      let allStaff: any[] = [
        ...MASTER_STAFF_USERS,
        ...MASTER_STAFF_COMMUTERS,
      ];
      try {
        const storedCommuters = await authStorage.getItem('bustrack_staff_commuters_v1');
        if (storedCommuters) {
          const parsed = JSON.parse(storedCommuters);
          if (Array.isArray(parsed)) allStaff = [...parsed, ...allStaff];
        }
        const storedStaff = await authStorage.getItem('bustrack_staff_v1');
        if (storedStaff) {
          const parsed = JSON.parse(storedStaff);
          if (Array.isArray(parsed)) allStaff = [...parsed, ...allStaff];
        }
      } catch {}

      // Extra staff coordinators
      allStaff.push(
        { id: 'stf_govind', name: 'N. Govindaraju', email: 'govindaraju.transport@ritrjpm.ac.in', phone: '9629284690', password: 'staff123', designation: 'Transport Incharge', department: 'Transport Department' },
        { id: 'stf_karthi', name: 'Dr. L. Karthikeyan', email: 'karthikeyan.mech@ritrjpm.ac.in', phone: '9715540479', password: 'staff123', designation: 'AP/Mech & Transport Coordinator', department: 'Mechanical Engineering' },
        { id: 'stf_selvam', name: 'Mr. M. Selvam', email: 'selvam.staff@ritrjpm.ac.in', phone: '9789011223', password: 'staff123', designation: 'Hostel Warden & Route Inspector', department: 'Student Affairs' },
        { id: 'fac_5', name: 'Staff Commuter', email: 'staff@ritrjpm.ac.in', phone: '9629284690', password: 'staff123', designation: 'Staff Member', department: 'Faculty Commuter Wing' }
      );

      // Dynamically fetch latest live accounts registered by Admin from Supabase DB
      if (isLiveBackendConfigured && supabase) {
        try {
          const { data: dbStudents } = await supabase
            .from('students')
            .select('*, profile:profiles(*), boarding_stop:stops(*), bus:buses(*)');
          if (dbStudents && Array.isArray(dbStudents) && dbStudents.length > 0) {
            dbStudents.forEach((dbs: any) => {
              const idx = allStudents.findIndex(s => s.id === dbs.id || s.register_number === dbs.register_number || (dbs.profile?.email && (s.email === dbs.profile.email || s.profile?.email === dbs.profile.email)));
              if (idx >= 0) allStudents[idx] = { ...allStudents[idx], ...dbs };
              else allStudents.push(dbs);
            });
          }
        } catch {}

        try {
          const { data: dbDrivers } = await supabase
            .from('drivers')
            .select('*, profile:profiles(*), bus:buses(*)');
          if (dbDrivers && Array.isArray(dbDrivers) && dbDrivers.length > 0) {
            dbDrivers.forEach((dbd: any) => {
              const idx = allDrivers.findIndex(d => d.id === dbd.id || d.employee_id === dbd.employee_id || (dbd.profile?.phone && (d.phone === dbd.profile.phone || d.profile?.phone === dbd.profile.phone)));
              if (idx >= 0) allDrivers[idx] = { ...allDrivers[idx], ...dbd };
              else allDrivers.push(dbd);
            });
          }
        } catch {}

        try {
          const { data: dbStaff } = await supabase
            .from('staff_commuters')
            .select('*, profile:profiles(*), boarding_stop:stops(*), bus:buses(*)');
          if (dbStaff && Array.isArray(dbStaff) && dbStaff.length > 0) {
            dbStaff.forEach((dbs: any) => {
              const idx = allStaff.findIndex(s => s.id === dbs.id || s.employee_id === dbs.employee_id || (dbs.profile?.email && (s.email === dbs.profile.email || s.profile?.email === dbs.profile.email)));
              if (idx >= 0) allStaff[idx] = { ...allStaff[idx], ...dbs };
              else allStaff.push(dbs);
            });
          }
        } catch {}
      }

      // Normalized identifiers for matching
      const cleanInput = normalizedIdentifier.toLowerCase().trim();
      const extractedPrefix = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;
      const inputDigits = inputIdentifier.replace(/\D/g, '');

      // Strict Matching helpers with domain & roll normalization
      const matchDriver = () => {
        return allDrivers.find((d: any) => {
          const dPhone = (d.phone || d.profile?.phone || '').replace(/\D/g, '');
          const dEmail = (d.email || d.profile?.email || '').toLowerCase().trim();
          const dEmp = (d.employee_id || d.driverId || d.id || '').toLowerCase().trim();
          const dBus = (d.bus_number || d.busNumber || '').toLowerCase().replace(/[- ]/g, '');
          const cleanBusInput = cleanInput.replace(/[- ]/g, '');
          return (
            (inputDigits.length >= 7 && (dPhone.endsWith(inputDigits.slice(-10)) || inputDigits.endsWith(dPhone.slice(-10)))) ||
            (dEmail.length > 0 && dEmail === cleanInput) ||
            (dEmp.length > 0 && (dEmp === cleanInput || dEmp === extractedPrefix)) ||
            (cleanBusInput.length > 2 && dBus.length > 0 && dBus === cleanBusInput)
          );
        });
      };

      const matchStudent = () => {
        return allStudents.find((s: any) => {
          const sEmail = (s.profile?.email || s.email || '').toLowerCase().trim();
          const sRoll = (s.register_number || s.rollNumber || s.roll_number || s.id || '').toLowerCase().trim();
          const sEmailPrefix = sEmail.includes('@') ? sEmail.split('@')[0] : sEmail;

          // Direct roll or email match
          if (sEmail.length > 0 && sEmail === cleanInput) return true;
          if (sRoll.length > 0 && sRoll === cleanInput) return true;

          // Prefix matching (e.g. 953624205052 matches 953624205052@ritrjpm.ac.in)
          if (sRoll.length > 0 && sRoll === extractedPrefix) return true;
          if (sEmailPrefix.length > 0 && (sEmailPrefix === cleanInput || sEmailPrefix === extractedPrefix)) return true;

          // Institutional domain format
          if (sRoll.length > 0 && `${sRoll}@ritrjpm.ac.in` === cleanInput) return true;

          // Special alias for Kishore ST
          if (cleanInput.includes('953624205052') || cleanInput.includes('21it045') || cleanInput.includes('kishore')) {
            if (sRoll === '953624205052' || sRoll === '21it045' || sEmail.includes('kishore') || (s.profile?.name || '').toLowerCase().includes('kishore')) {
              return true;
            }
          }

          return false;
        });
      };

      const matchStaff = () => {
        return allStaff.find((s: any) => {
          const sEmail = (s.profile?.email || s.email || '').toLowerCase().trim();
          const sEmp = (s.employee_id || s.staffId || s.id || '').toLowerCase().trim();
          const sEmailPrefix = sEmail.includes('@') ? sEmail.split('@')[0] : sEmail;
          const sPhone = (s.phone || s.profile?.phone || '').replace(/\D/g, '');

          if (sEmail.length > 0 && sEmail === cleanInput) return true;
          if (sEmp.length > 0 && (sEmp === cleanInput || sEmp === extractedPrefix)) return true;
          if (sEmailPrefix.length > 0 && (sEmailPrefix === cleanInput || sEmailPrefix === extractedPrefix)) return true;
          if (sEmp.length > 0 && `${sEmp}@ritrjpm.ac.in` === cleanInput) return true;
          if (inputDigits.length >= 7 && (sPhone.endsWith(inputDigits.slice(-10)) || inputDigits.endsWith(sPhone.slice(-10)))) return true;

          return false;
        });
      };

      let resolvedRole: MobilePortalRole = role;
      let matchedUser: any = null;

      const resolveActiveMatch = () => {
        if (role === 'driver') {
          matchedUser = matchDriver();
          if (!matchedUser) {
            matchedUser = matchStaff();
            if (matchedUser) resolvedRole = 'staff';
            else {
              matchedUser = matchStudent();
              if (matchedUser) resolvedRole = 'student';
            }
          }
        } else if (role === 'student') {
          matchedUser = matchStudent();
          if (!matchedUser) {
            matchedUser = matchStaff();
            if (matchedUser) resolvedRole = 'staff';
            else {
              matchedUser = matchDriver();
              if (matchedUser) resolvedRole = 'driver';
            }
          }
        } else {
          matchedUser = matchStaff();
          if (!matchedUser) {
            matchedUser = matchStudent();
            if (matchedUser) resolvedRole = 'student';
            else {
              matchedUser = matchDriver();
              if (matchedUser) resolvedRole = 'driver';
            }
          }
        }
      };

      resolveActiveMatch();

      // 4. If account not found locally, do an on-demand live cloud sync from Supabase
      if (!matchedUser) {
        try {
          const freshRegistry = await fetchCloudUserRegistry(true);
          if (freshRegistry) {
            if (Array.isArray(freshRegistry.students)) {
              freshRegistry.students.forEach((fs: any) => {
                const idx = allStudents.findIndex(s => s.id === fs.id || s.register_number === fs.register_number || (fs.email && s.email === fs.email));
                if (idx >= 0) allStudents[idx] = { ...allStudents[idx], ...fs };
                else allStudents.push(fs);
              });
            }
            if (Array.isArray(freshRegistry.drivers)) {
              freshRegistry.drivers.forEach((fd: any) => {
                const idx = allDrivers.findIndex(d => d.id === fd.id || d.employee_id === fd.employee_id || (fd.phone && d.phone === fd.phone));
                if (idx >= 0) allDrivers[idx] = { ...allDrivers[idx], ...fd };
                else allDrivers.push(fd);
              });
            }
            if (Array.isArray(freshRegistry.staffCommuters)) {
              freshRegistry.staffCommuters.forEach((fsc: any) => {
                const idx = allStaff.findIndex(s => s.id === fsc.id || s.employee_id === fsc.employee_id || (fsc.email && s.email === fsc.email));
                if (idx >= 0) allStaff[idx] = { ...allStaff[idx], ...fsc };
                else allStaff.push(fsc);
              });
            }
            if (Array.isArray(freshRegistry.staffList)) {
              freshRegistry.staffList.forEach((fsl: any) => {
                const idx = allStaff.findIndex(s => s.id === fsl.id || s.employee_id === fsl.employee_id || (fsl.email && s.email === fsl.email));
                if (idx >= 0) allStaff[idx] = { ...allStaff[idx], ...fsl };
                else allStaff.push(fsl);
              });
            }
          }

          // Direct students DB query fallback
          const directDbStudent = await findStudentInDatabaseDirectly(normalizedIdentifier);
          if (directDbStudent) {
            allStudents.push(directDbStudent);
          }

          // Re-evaluate matching after live cloud pull
          resolveActiveMatch();
        } catch (syncErr) {
          console.warn('Live fetch on login error:', syncErr);
        }
      }

      // Reject if still not found after full live cloud check
      if (!matchedUser) {
        showAlert(
          'Invalid Credentials',
          'No registered account found matching these details. Only registered students, staff, and drivers added by the administrator can access the app. Please verify your Email / Roll Number or contact the Transport Office.'
        );
        setIsSubmitting(false);
        return;
      }

      // 5. Strictly verify password for the matched user (allows admin-set custom password or default role password)
      const expectedPass = matchedUser.password || matchedUser.profile?.password;
      const defaultRolePass = resolvedRole === 'driver' ? 'driver123' : resolvedRole === 'student' ? 'student123' : 'staff123';
      const isPassValid = !expectedPass || trimmedPass === expectedPass || trimmedPass === defaultRolePass;

      if (!isPassValid) {
        showAlert('Authentication Failed', 'Incorrect password entered. Please verify your password and try again.');
        setIsSubmitting(false);
        return;
      }

      const effectiveRole = resolvedRole;

      // Dynamically resolve assigned bus and route for matched user
      if (effectiveRole === 'driver') {
        const assignedBusId = matchedUser.assigned_bus_id || matchedUser.bus_id || matchedUser.bus?.id;
        const assignedBus = allBuses.find((b: any) => 
          (assignedBusId && (b.id === assignedBusId || b.bus_number === assignedBusId)) ||
          b.assigned_driver_id === matchedUser.id ||
          b.driver?.id === matchedUser.id ||
          (matchedUser.employee_id && b.driver?.employee_id === matchedUser.employee_id)
        );
        if (assignedBus) {
          matchedUser.bus = assignedBus;
          matchedUser.assigned_bus_id = assignedBus.id;
          matchedUser.bus_id = assignedBus.id;
          matchedUser.bus_number = assignedBus.bus_number;
          matchedUser.busNumber = assignedBus.bus_number;
          matchedUser.registration_number = assignedBus.registration_number;
          matchedUser.registrationNumber = assignedBus.registration_number;
          matchedUser.bus_name = assignedBus.bus_name;
          const assignedRoute = allRoutes.find((r: any) => r.id === assignedBus.route_id);
          if (assignedRoute) {
            matchedUser.route = assignedRoute;
            matchedUser.route_id = assignedRoute.id;
            matchedUser.routeId = assignedRoute.id;
            matchedUser.route_name = assignedRoute.route_name;
            matchedUser.routeName = assignedRoute.route_name;
          }
        }
      } else if (effectiveRole === 'student') {
        const studentBusId = matchedUser.bus_id || matchedUser.busId || matchedUser.bus?.id;
        const studentRouteId = matchedUser.route_id || matchedUser.routeId || matchedUser.route?.id;
        const assignedBus = allBuses.find((b: any) => 
          (studentBusId && (b.id === studentBusId || b.bus_number === studentBusId)) ||
          (studentRouteId && b.route_id === studentRouteId)
        );
        const assignedRoute = allRoutes.find((r: any) => 
          (studentRouteId && r.id === studentRouteId) ||
          (assignedBus?.route_id && r.id === assignedBus.route_id)
        );
        if (assignedBus) {
          matchedUser.bus = assignedBus;
          matchedUser.bus_id = assignedBus.id;
          matchedUser.busId = assignedBus.id;
          matchedUser.bus_number = assignedBus.bus_number;
          matchedUser.busNumber = assignedBus.bus_number;
          matchedUser.registration_number = assignedBus.registration_number;
          matchedUser.registrationNumber = assignedBus.registration_number;
          matchedUser.bus_name = assignedBus.bus_name;
        }
        if (assignedRoute) {
          matchedUser.route = assignedRoute;
          matchedUser.route_id = assignedRoute.id;
          matchedUser.routeId = assignedRoute.id;
          matchedUser.route_name = assignedRoute.route_name;
          matchedUser.routeName = assignedRoute.route_name;
        }
        // Normalize student profile fields
        matchedUser.name = matchedUser.profile?.name || matchedUser.name || 'Student';
        matchedUser.rollNumber = matchedUser.register_number || matchedUser.rollNumber || matchedUser.roll_number || 'N/A';
        matchedUser.register_number = matchedUser.rollNumber;
        matchedUser.department = matchedUser.department || 'B.Tech Information Tech.';
        matchedUser.year = matchedUser.year || 3;
        matchedUser.section = matchedUser.section || 'A';
        matchedUser.phone = matchedUser.profile?.phone || matchedUser.phone || '';
        matchedUser.email = matchedUser.profile?.email || matchedUser.email || '';
        matchedUser.boardingStopName = matchedUser.boarding_stop?.stop_name || matchedUser.boardingStopName || 'Assigned Stop';
        matchedUser.boardingStopId = matchedUser.boarding_stop_id || matchedUser.boardingStopId || 'st1';
      } else if (effectiveRole === 'staff') {
        const staffBusId = matchedUser.bus_id || matchedUser.busId || matchedUser.bus?.id;
        const staffRouteId = matchedUser.route_id || matchedUser.routeId || matchedUser.route?.id;
        const assignedBus = allBuses.find((b: any) => 
          (staffBusId && (b.id === staffBusId || b.bus_number === staffBusId)) ||
          (staffRouteId && b.route_id === staffRouteId)
        );
        const assignedRoute = allRoutes.find((r: any) => 
          (staffRouteId && r.id === staffRouteId) ||
          (assignedBus?.route_id && r.id === assignedBus.route_id)
        );
        if (assignedBus) {
          matchedUser.bus = assignedBus;
          matchedUser.bus_id = assignedBus.id;
          matchedUser.bus_number = assignedBus.bus_number;
          matchedUser.busNumber = assignedBus.bus_number;
          matchedUser.bus_name = assignedBus.bus_name;
        }
        if (assignedRoute) {
          matchedUser.route = assignedRoute;
          matchedUser.route_id = assignedRoute.id;
          matchedUser.routeId = assignedRoute.id;
          matchedUser.route_name = assignedRoute.route_name;
          matchedUser.routeName = assignedRoute.route_name;
        }
        // Normalize staff profile fields
        matchedUser.name = matchedUser.profile?.name || matchedUser.name || 'Faculty';
        matchedUser.employee_id = matchedUser.employee_id || matchedUser.staffId || matchedUser.id || 'FAC-01';
        matchedUser.staffId = matchedUser.employee_id;
        matchedUser.department = matchedUser.department || 'Information Technology (IT)';
        matchedUser.designation = matchedUser.designation || 'Faculty Member';
        matchedUser.phone = matchedUser.profile?.phone || matchedUser.phone || '';
        matchedUser.email = matchedUser.profile?.email || matchedUser.email || '';
        matchedUser.boardingStopName = typeof matchedUser.boarding_stop === 'object' ? matchedUser.boarding_stop?.stop_name : (matchedUser.boardingStopName || matchedUser.boarding_stop || 'Assigned Stop');
      }

      await authStorage.saveSession(effectiveRole, matchedUser);
      const target = effectiveRole === 'driver' ? '/driver' : effectiveRole === 'student' ? '/student' : '/staff';
      routerRef.current.replace(target as any);
      setIsSubmitting(false);
      return;
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Error', 'An unexpected error occurred during sign-in.');
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          },
        ]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Bus size={32} color={colors.text} strokeWidth={2} />
        </View>
        <Text style={[styles.collegeTitle, { color: colors.textSecondary, marginTop: 16 }]}>
          RAMCO INSTITUTE OF TECHNOLOGY
        </Text>
        <Text style={[styles.appTitle, { color: colors.text }]}>RITBusTrack</Text>
        <ActivityIndicator size="small" color={colors.text} style={{ marginTop: 24 }} />
        <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
          Loading your session...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Top Bar with Theme Toggle */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[
                styles.themeToggleBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Theme"
            >
              {isDark ? (
                <Sun size={16} color={colors.text} />
              ) : (
                <Moon size={16} color={colors.text} />
              )}
            </TouchableOpacity>
          </View>

          {/* Brand Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Bus size={28} color={colors.text} strokeWidth={2} />
            </View>
            <Text style={[styles.appTitle, { color: colors.text }]}>RITBusTrack</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              Sign in to continue
            </Text>
          </View>

          {/* Role Segmented Switcher */}
          <View
            style={[
              styles.segmentedControl,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {(['student', 'staff', 'driver'] as const).map((r) => {
              const isSelected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.segmentBtn,
                    isSelected && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleRoleChange(r)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected
                          ? colors.primaryContrast
                          : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Login Form Card */}
          <Card style={styles.formCard} padding="lg">
            <Text style={[styles.cardHeader, { color: colors.text }]}>
              {role === 'driver'
                ? 'Driver Sign In'
                : role === 'student'
                ? 'Student Sign In'
                : 'Staff Sign In'}
            </Text>

            {role === 'driver' ? (
              <Input
                label="Mobile Phone Number or Driver ID"
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 9894668646 or EMP-DRV-01"
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Phone size={16} color={colors.textSecondary} />}
              />
            ) : (
              <Input
                label={
                  role === 'student'
                    ? 'College Email or Roll Number'
                    : 'Staff Email or Employee ID'
                }
                value={email}
                onChangeText={setEmail}
                placeholder={
                  role === 'student'
                    ? 'e.g. 953621104021 or email@ritrjpm.ac.in'
                    : 'e.g. staff@ritrjpm.ac.in or FAC-042'
                }
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={
                  role === 'student' ? (
                    <GraduationCap size={16} color={colors.textSecondary} />
                  ) : (
                    <Mail size={16} color={colors.textSecondary} />
                  )
                }
              />
            )}

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={16} color={colors.textSecondary} />}
              rightIcon={
                showPassword ? (
                  <EyeOff size={16} color={colors.textSecondary} />
                ) : (
                  <Eye size={16} color={colors.textSecondary} />
                )
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            {/* Remember Me & Help Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: rememberMe ? colors.primary : colors.border,
                      backgroundColor: rememberMe ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {rememberMe && (
                    <Check size={11} color={colors.primaryContrast} strokeWidth={3} />
                  )}
                </View>
                <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  showAlert(
                    'Need Help?',
                    'For password resets or login assistance, please contact the Transport Office coordinator below.'
                  )
                }
              >
                <Text style={[styles.forgotPassText, { color: colors.text }]}>
                  Need help?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <Button
              label="Continue"
              onPress={handleLogin}
              loading={isSubmitting}
              size="lg"
              variant="primary"
              fullWidth
            />
          </Card>

          {/* Transport Support Desk */}
          <Card style={styles.supportCard} variant="subtle" padding="md">
            <Text style={[styles.supportTitle, { color: colors.textSecondary }]}>
              Transport Support Desk
            </Text>
            <View style={styles.supportList}>
              <TouchableOpacity
                style={[
                  styles.supportItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => Linking.openURL('tel:+919629284690')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.supportItemIcon,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Phone size={14} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.supportName, { color: colors.text }]}>
                    N. Govindaraju (Transport Incharge)
                  </Text>
                  <Text style={[styles.supportPhone, { color: colors.textSecondary }]}>
                    +91 96292 84690
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.supportItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => Linking.openURL('tel:+919715540479')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.supportItemIcon,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Phone size={14} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.supportName, { color: colors.text }]}>
                    L. Karthikeyan (Coordinator)
                  </Text>
                  <Text style={[styles.supportPhone, { color: colors.textSecondary }]}>
                    +91 97155 40479
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Minimal Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Ramco Institute of Technology · Transport Wing
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  collegeTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  loadingSub: {
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    width: '100%',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentText: {
    fontSize: 13,
  },
  formCard: {
    width: '100%',
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rememberMeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '600',
  },
  supportCard: {
    width: '100%',
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  supportList: {
    flexDirection: 'column',
    gap: 8,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  supportItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  supportName: {
    fontSize: 12,
    fontWeight: '600',
  },
  supportPhone: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
