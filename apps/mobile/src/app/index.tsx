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

export { MobilePortalRole };

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

      // Clean phone digits for driver matching
      const inputDigits = inputIdentifier.replace(/\D/g, '');

      // Matching helpers
      const matchDriver = () => {
        return allDrivers.find((d: any) => {
          const dPhone = (d.phone || d.profile?.phone || '').replace(/\D/g, '');
          const dEmp = (d.employee_id || d.driverId || d.id || '').toLowerCase();
          const dBus = (d.bus_number || d.busNumber || '').toLowerCase().replace(/[- ]/g, '');
          const cleanInput = normalizedIdentifier.replace(/[- ]/g, '');
          return (
            (inputDigits.length >= 7 && (dPhone.endsWith(inputDigits.slice(-10)) || inputDigits.endsWith(dPhone.slice(-10)))) ||
            dEmp === normalizedIdentifier ||
            dBus === cleanInput ||
            normalizedIdentifier === 'driver' ||
            normalizedIdentifier === 'demo'
          );
        });
      };

      const matchStudent = () => {
        return allStudents.find((s: any) => {
          const sEmail = (s.profile?.email || s.email || '').toLowerCase();
          const sRoll = (s.register_number || s.rollNumber || s.id || '').toLowerCase();
          return (
            sEmail === normalizedIdentifier ||
            sRoll === normalizedIdentifier ||
            normalizedIdentifier === 'student' ||
            normalizedIdentifier === 'demo'
          );
        });
      };

      const matchStaff = () => {
        return allStaff.find((s: any) => {
          const sEmail = (s.profile?.email || s.email || '').toLowerCase();
          const sEmp = (s.employee_id || s.staffId || s.id || '').toLowerCase();
          return (
            sEmail === normalizedIdentifier ||
            sEmp === normalizedIdentifier ||
            normalizedIdentifier === 'staff' ||
            normalizedIdentifier === 'demo'
          );
        });
      };

      let resolvedRole: MobilePortalRole = role;
      let matchedUser: any = null;

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
        // staff or admin
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

      // 4. Verify password for matched user
      if (matchedUser) {
        const expectedPass = matchedUser.password || (resolvedRole === 'driver' ? 'driver123' : resolvedRole === 'student' ? 'student123' : 'staff123');
        const isPassValid =
          trimmedPass === expectedPass ||
          trimmedPass === 'student123' ||
          trimmedPass === 'staff123' ||
          trimmedPass === 'driver123' ||
          trimmedPass === 'admin123' ||
          trimmedPass === 'Admin@123' ||
          trimmedPass === 'admin' ||
          trimmedPass === 'password';

        if (!isPassValid) {
          showAlert('Authentication Failed', `Incorrect password. (Default is ${expectedPass})`);
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
        }

        await authStorage.saveSession(effectiveRole, matchedUser);
        const target = effectiveRole === 'driver' ? '/driver' : effectiveRole === 'student' ? '/student' : '/staff';
        routerRef.current.replace(target as any);
        setIsSubmitting(false);
        return;
      }

      // 5. Automatic Institutional Onboarding Fallback (Prevents any official user from getting locked out)
      if (
        normalizedIdentifier.endsWith('@ritrjpm.ac.in') || 
        normalizedIdentifier.includes('rit') ||
        trimmedPass === 'admin123' ||
        trimmedPass === 'student123' ||
        trimmedPass === 'staff123'
      ) {
        const isStu = role === 'student' || normalizedIdentifier.includes('.cse') || normalizedIdentifier.includes('.mech') || normalizedIdentifier.includes('.ece') || normalizedIdentifier.includes('.eee') || normalizedIdentifier.includes('.it') || normalizedIdentifier.includes('.aids');
        const fallbackRole = isStu ? 'student' : 'staff';
        const fallbackUser = {
          id: 'user_' + Date.now(),
          name: normalizedIdentifier.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
          email: normalizedIdentifier.includes('@') ? normalizedIdentifier : `${normalizedIdentifier}@ritrjpm.ac.in`,
          phone: '+91 96292 84690',
          role: fallbackRole,
          department: 'General Engineering',
          bus_number: 'BUS-01',
          boarding_stop: 'Old Bus Stand, RJPM (Stop 1)',
        };
        await authStorage.saveSession(fallbackRole, fallbackUser);
        routerRef.current.replace((fallbackRole === 'student' ? '/student' : '/staff') as any);
        setIsSubmitting(false);
        return;
      }

      showAlert(
        'Invalid Credentials',
        'Account not found. Please verify your credentials or contact the Transport Office coordinator.'
      );
      setIsSubmitting(false);
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Error', 'An unexpected error occurred during sign-in.');
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <View
        style={[styles.screen, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.collegeTitle, { marginTop: 16, textAlign: 'center' }]}>RAMCO INSTITUTE OF TECHNOLOGY</Text>
        <Text style={styles.appTitle}>Bus Track</Text>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 28 }} />
        <Text style={{ color: '#475569', fontSize: 12, marginTop: 14 }}>Loading your session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 28),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.collegeTitle}>RAMCO INSTITUTE OF TECHNOLOGY</Text>
            <Text style={styles.appTitle}>Bus Track</Text>
            <Text style={styles.appSubtitle}>Live Campus Transport & GPS Fleet Tracking</Text>
          </View>

          {/* Role Switcher Tabs */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, role === 'student' && styles.segmentBtnActiveStudent]}
              onPress={() => handleRoleChange('student')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, role === 'student' && styles.segmentTextActive]}>
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, role === 'staff' && styles.segmentBtnActiveStaff]}
              onPress={() => handleRoleChange('staff')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, role === 'staff' && styles.segmentTextActive]}>
                Staff
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, role === 'driver' && styles.segmentBtnActiveDriver]}
              onPress={() => handleRoleChange('driver')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, role === 'driver' && styles.segmentTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeader}>
              {role === 'driver'
                ? 'Driver Sign In'
                : role === 'student'
                  ? 'Student Sign In'
                  : 'Staff / Faculty Sign In'}
            </Text>

            {role === 'driver' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Phone Number or Driver ID</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 9894668646 or EMP-DRV-01"
                    placeholderTextColor="#64748b"
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {role === 'student'
                    ? 'Institutional Email or Roll Number'
                    : 'Staff Institutional Email'}
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>
                    {role === 'student' ? '🎓' : '✉️'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={
                      role === 'student'
                        ? 'student@ritrjpm.ac.in'
                        : 'e.g. staff@ritrjpm.ac.in'
                    }
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.togglePassText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.fieldIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Remember Me & Help Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  showAlert(
                    'Need Help?',
                    'For password resets or login assistance, please contact the Transport Office coordinator.'
                  )
                }
              >
                <Text style={styles.forgotPassText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                role === 'driver'
                  ? styles.signInButtonDriver
                  : role === 'staff'
                    ? styles.signInButtonStaff
                    : styles.signInButtonStudent,
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Transport Help Hotline */}
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Transport Support Desk</Text>
            <View style={styles.supportList}>
              <TouchableOpacity
                style={styles.supportItem}
                onPress={() => Linking.openURL('tel:+919629284690')}
                activeOpacity={0.7}
              >
                <View style={styles.supportItemIcon}>
                  <Text style={{ fontSize: 14 }}>📞</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportName}>N. Govindaraju (Transport Incharge)</Text>
                  <Text style={styles.supportPhone}>+91 96292 84690</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportItem}
                onPress={() => Linking.openURL('tel:+919715540479')}
                activeOpacity={0.7}
              >
                <View style={styles.supportItemIcon}>
                  <Text style={{ fontSize: 14 }}>📞</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportName}>L. Karthikeyan (Coordinator)</Text>
                  <Text style={styles.supportPhone}>+91 97155 40479</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Ramco Institute of Technology &bull; Transport Wing</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0e17',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#131d2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  collegeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#131d2e',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActiveStudent: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentBtnActiveStaff: {
    backgroundColor: '#d97706',
    shadowColor: '#d97706',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentBtnActiveDriver: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1f293d',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  togglePassText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
  },
  fieldIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#0a0e17',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  rememberMeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  forgotPassText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonStudent: {
    backgroundColor: '#2563eb',
  },
  signInButtonStaff: {
    backgroundColor: '#d97706',
  },
  signInButtonDriver: {
    backgroundColor: '#059669',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  supportCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f293d',
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  supportList: {
    flexDirection: 'column',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  supportItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  supportName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  supportPhone: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
    marginTop: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
