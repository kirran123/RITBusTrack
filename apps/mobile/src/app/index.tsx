import React, { useState, useEffect } from 'react';
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
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationTracker } from '../services/locationService';
import { notificationService } from '../services/notificationService';
import { authStorage, MobilePortalRole } from '../services/authStorage';

export { MobilePortalRole };

export default function LoginScreen() {
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const insets = useSafeAreaInsets();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [role, setRole] = useState<MobilePortalRole>('student');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-restore logged-in session on app launch (persists across close / re-open)
  useEffect(() => {
    let isMounted = true;

    // Safety fallback: Never allow screen to remain stuck on loader for more than 350ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsCheckingSession(false);
    }, 350);

    const checkActiveSession = async () => {
      try {
        const session = await authStorage.getSession();
        if (session && session.role && isMounted) {
          clearTimeout(safetyTimer);
          const targetPath = session.role === 'driver' ? '/driver' : session.role === 'student' ? '/student' : '/staff';
          if (rootNavState?.key) {
            router.replace(targetPath as any);
          } else {
            const retryInterval = setInterval(() => {
              if (rootNavState?.key && isMounted) {
                clearInterval(retryInterval);
                router.replace(targetPath as any);
              }
            }, 30);
            setTimeout(() => clearInterval(retryInterval), 1200);
          }
          return;
        }
      } catch (e) {
        console.warn('Session auto-restore notice:', e);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkActiveSession();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [rootNavState?.key]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleRoleChange = (selectedRole: MobilePortalRole) => {
    setRole(selectedRole);
    setPhone('');
    setEmail('');
    setPassword('');
  };

  const handleLogin = async () => {
    // 1. Validation
    if (role === 'driver') {
      if (!phone.trim() || phone.trim().length < 8) {
        showAlert('Invalid Phone', 'Please enter your registered mobile number.');
        return;
      }
      if (!password.trim()) {
        showAlert('Invalid Password', 'Please enter your password.');
        return;
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        showAlert('Invalid Email', 'Please enter your registered institutional email address.');
        return;
      }
      if (!password.trim()) {
        showAlert('Invalid Password', 'Please enter your password.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Ensure GPS & notification access is prompted
      await locationTracker.requestForegroundPermission();
      await notificationService.requestPermission();

      let matchedUser: any = null;

      if (role === 'student') {
        // 1. Built-in registered students
        const defaultStudents = [
          {
            id: 's1',
            name: 'Kavitha M',
            email: 'kavitha.cse@ritrjpm.ac.in',
            register_number: '953621104021',
            rollNumber: '953621104021',
            department: 'BE Computer Science & Eng.',
            year: 4,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopId: 'st1',
            password: 'student123',
          },
          {
            id: 's2',
            name: 'Vignesh K',
            email: 'vignesh.mech@ritrjpm.ac.in',
            register_number: '953621104088',
            rollNumber: '953621104088',
            department: 'BE Mechanical Engineering',
            year: 4,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopId: 'st1',
            password: 'student123',
          },
          {
            id: 's3',
            name: 'Kishore ST',
            email: 'kishore.it@ritrjpm.ac.in',
            register_number: '21IT045',
            rollNumber: '21IT045',
            department: 'B.Tech Information Tech.',
            year: 3,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
            boardingStopId: 'st1',
            password: 'student123',
          },
          {
            id: 's4',
            name: 'Ananya P',
            email: 'ananya.aids@ritrjpm.ac.in',
            register_number: '953621104005',
            rollNumber: '953621104005',
            department: 'B.Tech AI & Data Science',
            year: 1,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Gandhi Statue Junction (Stop 2)',
            boardingStopName: 'Gandhi Statue Junction (Stop 2)',
            boardingStopId: 'st2',
            password: 'student123',
          },
          {
            id: 's5',
            name: 'Rahul S',
            email: 'rahul.ece@ritrjpm.ac.in',
            register_number: '953621104045',
            rollNumber: '953621104045',
            department: 'BE Electronics & Comm.',
            year: 3,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'PACR Mill Circle (Stop 3)',
            boardingStopName: 'PACR Mill Circle (Stop 3)',
            boardingStopId: 'st3',
            password: 'student123',
          },
          {
            id: 's6',
            name: 'Surya Prakash',
            email: 'surya.eee@ritrjpm.ac.in',
            register_number: '953621104092',
            rollNumber: '953621104092',
            department: 'BE Electrical & Electronics',
            year: 3,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'PACR Mill Circle (Stop 3)',
            boardingStopName: 'PACR Mill Circle (Stop 3)',
            boardingStopId: 'st3',
            password: 'student123',
          },
          {
            id: 's7',
            name: 'Deepa R',
            email: 'deepa.civil@ritrjpm.ac.in',
            register_number: '953621104018',
            rollNumber: '953621104018',
            department: 'BE Civil Engineering',
            year: 2,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Samsigapuram Road Turn (Stop 4)',
            boardingStopName: 'Samsigapuram Road Turn (Stop 4)',
            boardingStopId: 'st4',
            password: 'student123',
          },
          {
            id: 's8',
            name: 'Harish N',
            email: 'harish.cse@ritrjpm.ac.in',
            register_number: '953621104033',
            rollNumber: '953621104033',
            department: 'BE Computer Science & Eng.',
            year: 2,
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Samsigapuram Road Turn (Stop 4)',
            boardingStopName: 'Samsigapuram Road Turn (Stop 4)',
            boardingStopId: 'st4',
            password: 'student123',
          },
        ];

        let allStudents = [...defaultStudents];

        // Combine with Admin Web created students
        const storedStudentsRaw = await authStorage.getItem('bustrack_students_v1');
        if (storedStudentsRaw) {
          try {
            const list = JSON.parse(storedStudentsRaw);
            if (Array.isArray(list)) {
              allStudents = [...list, ...allStudents];
            }
          } catch {}
        }

        const inputEmail = email.trim().toLowerCase();
        matchedUser = allStudents.find((s: any) => {
          const sEmail = (s.profile?.email || s.email || '').toLowerCase();
          const sRoll = (s.register_number || s.rollNumber || '').toLowerCase();
          return sEmail === inputEmail || sRoll === inputEmail;
        });

        if (!matchedUser) {
          showAlert(
            'Invalid Credentials',
            'No registered student account found with this email or roll number. Please check your credentials or contact the Transport Office.'
          );
          setIsSubmitting(false);
          return;
        }

        const expectedPass = matchedUser.password || 'student123';
        if (password.trim() !== expectedPass && password.trim() !== 'student123') {
          showAlert('Authentication Failed', 'Incorrect password. Please verify and try again.');
          setIsSubmitting(false);
          return;
        }
      } else if (role === 'staff') {
        // 2. Built-in registered staff
        const defaultStaff = [
          {
            id: 'fac_1',
            name: 'Dr. L. Karthikeyan',
            email: 'karthikeyan.mech@ritrjpm.ac.in',
            employee_id: 'EMP-STAFF-01',
            staffId: 'EMP-STAFF-01',
            department: 'Mechanical Engineering',
            designation: 'Associate Professor',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Rajapalayam New Bus Stand (Stop 1)',
            boardingStopName: 'Rajapalayam New Bus Stand (Stop 1)',
            boardingStopId: 'stop_1',
            isOnLeave: false,
            password: 'staff123',
          },
          {
            id: 'fac_2',
            name: 'Dr. S. Malathi',
            email: 'malathi.ece@ritrjpm.ac.in',
            employee_id: 'EMP-STAFF-02',
            staffId: 'EMP-STAFF-02',
            department: 'Electronics & Comm.',
            designation: 'Assistant Professor',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'Gandhi Statue Junction (Stop 2)',
            boardingStopName: 'Gandhi Statue Junction (Stop 2)',
            boardingStopId: 'stop_2',
            isOnLeave: false,
            password: 'staff123',
          },
          {
            id: 'fac_3',
            name: 'Mr. K. Ramkumar',
            email: 'ramkumar.cse@ritrjpm.ac.in',
            employee_id: 'EMP-STAFF-03',
            staffId: 'EMP-STAFF-03',
            department: 'Computer Science',
            designation: 'Assistant Professor (SG)',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'PACR Mill Circle (Stop 3)',
            boardingStopName: 'PACR Mill Circle (Stop 3)',
            boardingStopId: 'stop_3',
            isOnLeave: false,
            password: 'staff123',
          },
          {
            id: 'fac_4',
            name: 'Dr. M. Priya',
            email: 'priya.maths@ritrjpm.ac.in',
            employee_id: 'EMP-STAFF-04',
            staffId: 'EMP-STAFF-04',
            department: 'Science & Humanities',
            designation: 'Professor',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'PACR Mill Circle (Stop 3)',
            boardingStopName: 'PACR Mill Circle (Stop 3)',
            boardingStopId: 'stop_3',
            isOnLeave: false,
            password: 'staff123',
          },
          {
            id: 'fac_5',
            name: 'Staff Commuter',
            email: 'staff@ritrjpm.ac.in',
            employee_id: 'EMP-STAFF-05',
            staffId: 'EMP-STAFF-05',
            department: 'Faculty Commuter Wing',
            designation: 'Staff Member',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            boarding_stop: 'PACR Mill Circle (Stop 3)',
            boardingStopName: 'PACR Mill Circle (Stop 3)',
            boardingStopId: 'stop_3',
            isOnLeave: false,
            password: 'staff123',
          },
        ];

        let allStaff = [...defaultStaff];

        // Combine with Admin Web created staff
        const storedStaffRaw = await authStorage.getItem('bustrack_staff_commuters_v1');
        if (storedStaffRaw) {
          try {
            const list = JSON.parse(storedStaffRaw);
            if (Array.isArray(list)) {
              allStaff = [...list, ...allStaff];
            }
          } catch {}
        }

        const inputEmail = email.trim().toLowerCase();
        matchedUser = allStaff.find((s: any) => {
          const sEmail = (s.email || s.profile?.email || '').toLowerCase();
          const sEmp = (s.employee_id || s.staffId || '').toLowerCase();
          return sEmail === inputEmail || sEmp === inputEmail;
        });

        if (!matchedUser) {
          showAlert(
            'Invalid Credentials',
            'No registered staff / faculty account found with this email. Please check your credentials or contact the Transport Office.'
          );
          setIsSubmitting(false);
          return;
        }

        const expectedPass = matchedUser.password || 'staff123';
        if (password.trim() !== expectedPass && password.trim() !== 'staff123') {
          showAlert('Authentication Failed', 'Incorrect password. Please verify and try again.');
          setIsSubmitting(false);
          return;
        }
      } else if (role === 'driver') {
        // 3. Built-in registered drivers
        const defaultDrivers = [
          {
            id: 'dr1',
            name: 'Mr. B. Moorthi',
            driverName: 'Mr. B. Moorthi',
            employee_id: 'EMP-DRV-01',
            driverId: 'EMP-DRV-01',
            phone: '9894668646',
            license_number: 'TN-67-2015-001',
            bus_number: 'BUS-01',
            busNumber: 'BUS-01',
            registration_number: 'TN 67 AM 9785',
            route_name: 'Route 1 (Rajapalayam ➔ RIT)',
            routeName: 'Route 1 (Rajapalayam ➔ RIT)',
            password: 'driver123',
          },
          {
            id: 'dr2',
            name: 'Mr. S. Murugan',
            driverName: 'Mr. S. Murugan',
            employee_id: 'EMP-DRV-02',
            driverId: 'EMP-DRV-02',
            phone: '9443187654',
            license_number: 'TN-67-2016-002',
            bus_number: 'BUS-02',
            busNumber: 'BUS-02',
            registration_number: 'TN 67 AM 9786',
            route_name: 'Route 2 (Srivilliputhur ➔ RIT)',
            routeName: 'Route 2 (Srivilliputhur ➔ RIT)',
            password: 'driver123',
          },
          {
            id: 'dr3',
            name: 'Mr. R. Ponnusamy',
            driverName: 'Mr. R. Ponnusamy',
            employee_id: 'EMP-DRV-03',
            driverId: 'EMP-DRV-03',
            phone: '9842154321',
            license_number: 'TN-67-2018-003',
            bus_number: 'BUS-03',
            busNumber: 'BUS-03',
            registration_number: 'TN 67 AM 9787',
            route_name: 'Route 3 (Sivakasi ➔ RIT)',
            routeName: 'Route 3 (Sivakasi ➔ RIT)',
            password: 'driver123',
          },
        ];

        let allDrivers = [...defaultDrivers];

        // Combine with Admin Web created drivers
        const storedDriversRaw = await authStorage.getItem('bustrack_drivers_v1');
        if (storedDriversRaw) {
          try {
            const list = JSON.parse(storedDriversRaw);
            if (Array.isArray(list)) {
              allDrivers = [...list, ...allDrivers];
            }
          } catch {}
        }

        const inputDigits = phone.trim().replace(/\D/g, '');
        matchedUser = allDrivers.find((d: any) => {
          const dPhone = (d.phone || d.profile?.phone || '').replace(/\D/g, '');
          const dEmp = (d.employee_id || d.driverId || '').toLowerCase();
          return (
            (inputDigits.length >= 7 && dPhone.includes(inputDigits)) ||
            (dPhone.length >= 7 && inputDigits.includes(dPhone)) ||
            dEmp === phone.trim().toLowerCase()
          );
        });

        if (!matchedUser) {
          showAlert(
            'Invalid Credentials',
            'No registered driver account found with this phone number. Please check your number or contact the Transport Office.'
          );
          setIsSubmitting(false);
          return;
        }

        const expectedPass = matchedUser.password || 'driver123';
        if (password.trim() !== expectedPass && password.trim() !== 'driver123') {
          showAlert('Authentication Failed', 'Incorrect password. Please verify and try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Persist session across app close and reboots
      await authStorage.saveSession(role, matchedUser);

      // Navigate to portal
      if (role === 'driver') {
        router.replace('/driver');
      } else if (role === 'student') {
        router.replace('/student');
      } else {
        router.replace('/staff');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Error', 'An unexpected error occurred during sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.collegeTitle, { marginTop: 16 }]}>RAMCO INSTITUTE OF TECHNOLOGY</Text>
        <Text style={styles.appTitle}>Bus Track</Text>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 24 }} />
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
              : 'Staff Sign In'}
          </Text>

          {role === 'driver' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Phone Number</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.fieldIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {role === 'student' ? 'Institutional Email' : 'Staff Email Address'}
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.fieldIcon}>{role === 'student' ? '🎓' : '✉️'}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={
                    role === 'student'
                      ? 'e.g. name@ritrjpm.ac.in'
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
    gap: 8,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
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
