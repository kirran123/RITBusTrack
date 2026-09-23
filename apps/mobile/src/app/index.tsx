import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export type MobilePortalRole = 'driver' | 'student' | 'staff';

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<MobilePortalRole>('driver');
  const [phone, setPhone] = useState('9894668646');
  const [email, setEmail] = useState('kishore.it@ritrjpm.ac.in');
  const [password, setPassword] = useState('driver123');
  const [showPassword, setShowPassword] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSelectRole = (r: MobilePortalRole) => {
    setRole(r);
    if (r === 'driver') {
      setPhone('9894668646');
      setPassword('driver123');
    } else if (r === 'student') {
      setEmail('kishore.it@ritrjpm.ac.in');
      setPassword('student123');
    } else {
      setEmail('ganesh.staff@ritrjpm.ac.in');
      setPassword('staff123');
    }
  };

  const handleLogin = async () => {
    if (role === 'driver') {
      if (!phone || phone.trim().length < 8) {
        showAlert('Invalid Input', 'Please enter a valid driver phone number (e.g. 9894668646)');
        return;
      }
      if (!password || password.trim().length === 0) {
        showAlert('Invalid Input', 'Please enter your driver password');
        return;
      }
    } else {
      if (!email || !email.includes('@')) {
        showAlert('Invalid Input', 'Please enter a valid institutional email address');
        return;
      }
      if (!password || password.trim().length === 0) {
        showAlert('Invalid Input', 'Please enter your password');
        return;
      }
    }

    // Dynamic Credentials Sync Check against localStorage (Web Only)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        if (role === 'student') {
          const storedStudentsRaw = localStorage.getItem('bustrack_students_v1');
          if (storedStudentsRaw) {
            const storedStudents = JSON.parse(storedStudentsRaw);
            if (Array.isArray(storedStudents)) {
              const matchedStudent = storedStudents.find(
                s => (s.profile?.email || '').toLowerCase() === email.trim().toLowerCase() ||
                     (s.register_number || '').toLowerCase() === email.trim().toLowerCase()
              );
              if (matchedStudent && matchedStudent.password && matchedStudent.password !== password.trim()) {
                showAlert('Authentication Failed', `Incorrect password for ${email}. Please check with the transport administrator.`);
                return;
              }
              if (matchedStudent) {
                localStorage.setItem('bustrack_current_mobile_student', JSON.stringify(matchedStudent));
              }
            }
          }
        } else if (role === 'staff') {
          const storedStaffRaw = localStorage.getItem('bustrack_staff_commuters_v1');
          if (storedStaffRaw) {
            const storedStaff = JSON.parse(storedStaffRaw);
            if (Array.isArray(storedStaff)) {
              const matchedStaff = storedStaff.find(
                s => (s.email || s.profile?.email || '').toLowerCase() === email.trim().toLowerCase() ||
                     (s.employee_id || '').toLowerCase() === email.trim().toLowerCase()
              );
              if (matchedStaff && matchedStaff.password && matchedStaff.password !== password.trim()) {
                showAlert('Authentication Failed', `Incorrect password for ${email}. Please check with the transport administrator.`);
                return;
              }
              if (matchedStaff) {
                localStorage.setItem('bustrack_current_mobile_staff', JSON.stringify(matchedStaff));
              }
            }
          }
        } else if (role === 'driver') {
          const storedDriversRaw = localStorage.getItem('bustrack_drivers_v1');
          let matchedDriver: any = null;
          if (storedDriversRaw) {
            try {
              const storedDrivers = JSON.parse(storedDriversRaw);
              if (Array.isArray(storedDrivers)) {
                matchedDriver = storedDrivers.find(
                  d => (d.phone || d.profile?.phone || '').replace(/\D/g, '').includes(phone.trim().replace(/\D/g, '')) ||
                       (d.employee_id || '').toLowerCase() === phone.trim().toLowerCase()
                );
              }
            } catch {}
          }
          if (!matchedDriver) {
            matchedDriver = {
              id: 'dr1',
              name: 'Mr. B. Moorthi',
              employee_id: 'EMP-DRV-01',
              phone: '+91 9894668646',
              license_number: 'TN-67-2015-001',
              bus_number: 'BUS-01',
              registration_number: 'TN 67 AM 9785',
              route_name: 'Route 1 (Rajapalayam ➔ RIT)',
            };
          }
          localStorage.setItem('bustrack_current_mobile_driver', JSON.stringify(matchedDriver));
        }
      } catch (err) {
        console.log('Mobile login sync check note:', err);
      }
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'default') {
        await window.Notification.requestPermission();
      }
    } catch (e) {
      console.log('Login permission priming:', e);
    }

    if (role === 'driver') {
      router.push('/driver');
    } else if (role === 'student') {
      router.push('/student');
    } else {
      router.push('/staff');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#080c14' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top College Branding */}
        <View style={styles.header}>
          <View style={styles.logoGlow}>
            <View style={styles.iconRing}>
              <Text style={{ fontSize: 32 }}>🚌</Text>
            </View>
          </View>

          <Text style={styles.collegeName}>Ramco Institute of Technology</Text>
          <Text style={styles.title}>Bus Tracking Portal</Text>
          <Text style={styles.subtitle}>Autonomous GPS Telemetry & Passenger Transit Network</Text>

          <View style={styles.engineBadge}>
            <View style={styles.engineDot} />
            <Text style={styles.engineText}>LIVE GPS TRANSIT NETWORK &bull; CONNECTED</Text>
          </View>
        </View>

        {/* Access Portal Selector */}
        <View style={styles.roleCard}>
          <Text style={styles.sectionHeader}>SELECT SIGN-IN PORTAL</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              onPress={() => handleSelectRole('driver')}
              style={[styles.roleBtn, role === 'driver' && styles.roleBtnActiveDriver]}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}>👨‍✈️</Text>
              <Text style={[styles.roleBtnText, role === 'driver' && styles.roleBtnTextActive]}>
                DRIVER
              </Text>
              {role === 'driver' && <View style={styles.activePillGreen} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectRole('student')}
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActiveStudent]}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}>🎓</Text>
              <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>
                STUDENT
              </Text>
              {role === 'student' && <View style={styles.activePillBlue} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectRole('staff')}
              style={[styles.roleBtn, role === 'staff' && styles.roleBtnActiveStaff]}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}>👔</Text>
              <Text style={[styles.roleBtnText, role === 'staff' && styles.roleBtnTextActive]}>
                STAFF
              </Text>
              {role === 'staff' && <View style={styles.activePillAmber} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign In Form Card */}
        <View style={styles.authCard}>
          {role === 'driver' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="9894668646"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {role === 'student' ? 'Student College Email' : 'Staff Member Email'}
              </Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>{role === 'student' ? '🎓' : '👔'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={role === 'student' ? 'student@ritrjpm.ac.in' : 'staff@ritrjpm.ac.in'}
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPassText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              role === 'driver' && styles.submitBtnDriver,
              role === 'student' && styles.submitBtnStudent,
              role === 'staff' && styles.submitBtnStaff,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {role === 'driver'
                ? 'Sign In as Driver'
                : role === 'student'
                ? 'Sign In as Student'
                : 'Sign In as Staff'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info & Developer Credit */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerCollege}>Ramco Institute of Technology &bull; Transport Wing</Text>
          <View style={styles.creditBox}>
            <Text style={styles.creditAuthor}>
              Designed and Developed by <Text style={styles.creditAuthorHighlight}>Kirran S T</Text>
            </Text>
            <Text style={styles.creditDept}>Department of Information Technology</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 40,
    backgroundColor: '#080c14',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoGlow: {
    shadowColor: '#2563eb',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 10,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  collegeName: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 320,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  engineText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roleCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#020617',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    position: 'relative',
  },
  roleBtnActiveDriver: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  roleBtnActiveStudent: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  roleBtnActiveStaff: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  roleBtnTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  activePillGreen: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#10b981',
    marginTop: 4,
  },
  activePillBlue: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
    marginTop: 4,
  },
  activePillAmber: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#f59e0b',
    marginTop: 4,
  },
  authCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  showPassText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 12,
    fontSize: 13.5,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDriver: {
    backgroundColor: '#059669',
    shadowColor: '#10b981',
  },
  submitBtnStudent: {
    backgroundColor: '#2563eb',
    shadowColor: '#3b82f6',
  },
  submitBtnStaff: {
    backgroundColor: '#d97706',
    shadowColor: '#f59e0b',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 0.4,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  footerCollege: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  creditBox: {
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    width: '100%',
  },
  creditAuthor: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  creditAuthorHighlight: {
    color: '#38bdf8',
    fontWeight: '900',
  },
  creditDept: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
