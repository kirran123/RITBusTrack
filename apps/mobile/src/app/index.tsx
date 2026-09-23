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
        if (Platform.OS === 'web') {
          window.alert('Please enter a valid driver phone number (e.g. 9894668646)');
        }
        return;
      }
      if (!password || password.trim().length === 0) {
        if (Platform.OS === 'web') {
          window.alert('Please enter your driver password');
        }
        return;
      }
    } else {
      if (!email || !email.includes('@')) {
        if (Platform.OS === 'web') {
          window.alert('Please enter a valid institutional email address');
        }
        return;
      }
      if (!password || password.trim().length === 0) {
        if (Platform.OS === 'web') {
          window.alert('Please enter your password');
        }
        return;
      }
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
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
          <Text style={styles.sectionHeader}>SELECT YOUR SIGN-IN PORTAL</Text>
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
          {role === 'driver' && (
            <View style={styles.driverInfoBanner}>
              <View style={styles.driverAvatar}>
                <Text style={{ fontSize: 22 }}>👨‍✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverName}>Driver Portal</Text>
                  <View style={styles.busBadge}>
                    <Text style={styles.busBadgeText}>PHONE & PASSWORD LOGIN</Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>
                  Log in with your registered phone number & password configured by transport admin.
                </Text>
              </View>
            </View>
          )}

          {role === 'student' && (
            <View style={styles.studentInfoBanner}>
              <View style={styles.studentAvatar}>
                <Text style={{ fontSize: 22 }}>🎓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverName}>Student Bus Tracker</Text>
                  <View style={styles.busBadgeBlue}>
                    <Text style={styles.busBadgeTextBlue}>EMAIL & PASSWORD</Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>
                  Realtime Bus ETA, Boarding Stop Alerts & Leave Requests
                </Text>
              </View>
            </View>
          )}

          {role === 'staff' && (
            <View style={styles.staffInfoBanner}>
              <View style={styles.staffAvatar}>
                <Text style={{ fontSize: 22 }}>👔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverName}>Staff Commuter</Text>
                  <View style={styles.busBadgeAmber}>
                    <Text style={styles.busBadgeTextAmber}>EMAIL & PASSWORD</Text>
                  </View>
                </View>
                <Text style={styles.driverMeta}>
                  Bus Pass Verification, Live Radar & Route Intelligence
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.inputSectionTitle}>LOGIN CREDENTIALS</Text>

          {role === 'driver' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver Registered Phone Number</Text>
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
                {role === 'student' ? 'Student Institutional Email' : 'Staff Member Email'}
              </Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>{role === 'student' ? '🎓' : '👔'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={role === 'student' ? 'kishore.it@ritrjpm.ac.in' : 'ganesh.staff@ritrjpm.ac.in'}
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
              <Text style={styles.inputLabel}>
                {role === 'driver' ? 'Driver App Password' : 'Password'}
              </Text>
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
                ? 'Sign In with Phone & Launch Cockpit'
                : role === 'student'
                ? 'Sign In as Student'
                : 'Sign In as Staff Commuter'}
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
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  driverInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  studentInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    marginBottom: 16,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  staffInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#d97706',
    marginBottom: 16,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#451a03',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  driverName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  busBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  busBadgeText: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  busBadgeBlue: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  busBadgeTextBlue: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  busBadgeAmber: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  busBadgeTextAmber: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  driverMeta: {
    color: '#94a3b8',
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  inputSectionTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
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
    fontSize: 13,
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
