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
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationTracker } from '../services/locationService';
import { notificationService } from '../services/notificationService';

export type MobilePortalRole = 'driver' | 'student' | 'staff';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<MobilePortalRole>('student');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request permissions smoothly after UI mount (Location -> Notifications)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await locationTracker.requestForegroundPermission().catch(() => false);
        setTimeout(async () => {
          await notificationService.requestPermission().catch(() => false);
        }, 400);
      } catch (e) {
        console.log('Permission setup:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

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

      // Sync user profile state (Web & Mobile local session)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        if (role === 'student') {
          const storedStudentsRaw = localStorage.getItem('bustrack_students_v1');
          let matchedStudent: any = null;
          if (storedStudentsRaw) {
            try {
              const list = JSON.parse(storedStudentsRaw);
              if (Array.isArray(list)) {
                matchedStudent = list.find(
                  (s: any) =>
                    (s.profile?.email || s.email || '').toLowerCase() === email.trim().toLowerCase() ||
                    (s.register_number || s.rollNumber || '').toLowerCase() === email.trim().toLowerCase()
                );
                if (matchedStudent && matchedStudent.password && matchedStudent.password !== password.trim()) {
                  showAlert('Authentication Failed', 'Incorrect password. Please verify and try again.');
                  setIsSubmitting(false);
                  return;
                }
              }
            } catch {}
          }
          if (!matchedStudent) {
            matchedStudent = {
              id: 'st_' + Date.now(),
              name: email.split('@')[0].toUpperCase(),
              email: email.trim(),
              register_number: '953621104023',
              department: 'Information Technology',
              year: 4,
              bus_number: 'BUS-01',
              boarding_stop: 'Gandhi Statue Junction (Stop 2)',
            };
          }
          localStorage.setItem('bustrack_current_mobile_student', JSON.stringify(matchedStudent));
        } else if (role === 'staff') {
          const storedStaffRaw = localStorage.getItem('bustrack_staff_commuters_v1');
          let matchedStaff: any = null;
          if (storedStaffRaw) {
            try {
              const list = JSON.parse(storedStaffRaw);
              if (Array.isArray(list)) {
                matchedStaff = list.find(
                  (s: any) =>
                    (s.email || s.profile?.email || '').toLowerCase() === email.trim().toLowerCase() ||
                    (s.employee_id || '').toLowerCase() === email.trim().toLowerCase()
                );
                if (matchedStaff && matchedStaff.password && matchedStaff.password !== password.trim()) {
                  showAlert('Authentication Failed', 'Incorrect password. Please verify and try again.');
                  setIsSubmitting(false);
                  return;
                }
              }
            } catch {}
          }
          if (!matchedStaff) {
            matchedStaff = {
              id: 'fac_' + Date.now(),
              name: email.split('@')[0].toUpperCase(),
              email: email.trim(),
              employee_id: 'EMP-STAFF-04',
              department: 'Faculty Commuter',
              designation: 'Faculty Member',
              bus_number: 'BUS-01',
              boarding_stop: 'PACR Mill Circle (Stop 3)',
            };
          }
          localStorage.setItem('bustrack_current_mobile_staff', JSON.stringify(matchedStaff));
        } else if (role === 'driver') {
          const storedDriversRaw = localStorage.getItem('bustrack_drivers_v1');
          let matchedDriver: any = null;
          if (storedDriversRaw) {
            try {
              const list = JSON.parse(storedDriversRaw);
              if (Array.isArray(list)) {
                matchedDriver = list.find(
                  (d: any) =>
                    (d.phone || d.profile?.phone || '').replace(/\D/g, '').includes(phone.trim().replace(/\D/g, '')) ||
                    (d.employee_id || '').toLowerCase() === phone.trim().toLowerCase()
                );
              }
            } catch {}
          }
          if (!matchedDriver) {
            matchedDriver = {
              id: 'dr1',
              name: 'Driver (' + phone.trim() + ')',
              employee_id: 'EMP-DRV-01',
              phone: phone.trim(),
              license_number: 'TN-67-2015-001',
              bus_number: 'BUS-01',
              registration_number: 'TN 67 AM 9785',
              route_name: 'Route 1 (Rajapalayam ➔ RIT)',
            };
          }
          localStorage.setItem('bustrack_current_mobile_driver', JSON.stringify(matchedDriver));
        }
      }

      // Navigate to destination
      if (role === 'driver') {
        router.push('/driver');
      } else if (role === 'student') {
        router.push('/student');
      } else {
        router.push('/staff');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Error', 'An unexpected error occurred during sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
