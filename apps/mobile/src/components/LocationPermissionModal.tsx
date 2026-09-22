import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { locationTracker } from '../services/locationService';

interface LocationPermissionBannerProps {
  role?: 'driver' | 'student' | 'admin';
  isGranted: boolean;
  onRequestPermission: () => void;
  onOpenSettings?: () => void;
}

export const LocationPermissionBanner: React.FC<LocationPermissionBannerProps> = ({
  role = 'student',
  isGranted,
  onRequestPermission,
  onOpenSettings,
}) => {
  if (isGranted) {
    return (
      <View style={styles.grantedBadge}>
        <Text style={styles.grantedDot}>🟢</Text>
        <Text style={styles.grantedText}>GPS Location Access Active</Text>
      </View>
    );
  }

  const roleText =
    role === 'driver'
      ? 'Location permission is required to broadcast live GPS coordinates to students and admins during trips.'
      : 'Enable location access to view your distance from the boarding stop and incoming bus in real-time.';

  return (
    <View style={styles.bannerCard}>
      <View style={styles.bannerHeader}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 18 }}>📍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Location Access Required</Text>
          <Text style={styles.bannerSubtitle}>{roleText}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onRequestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>

        {onOpenSettings && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenSettings}>
            <Text style={styles.secondaryBtnText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface LocationPermissionModalProps {
  visible: boolean;
  role?: 'driver' | 'student';
  onClose: () => void;
  onGranted: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  visible,
  role = 'driver',
  onClose,
  onGranted,
}) => {
  const handleRequest = async () => {
    const granted = await locationTracker.requestForegroundPermission();
    if (granted) {
      if (role === 'driver') {
        await locationTracker.requestBackgroundPermission();
      }
      onGranted();
      onClose();
    } else {
      locationTracker.openSettings();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconWrap}>
            <Text style={{ fontSize: 36 }}>🛰️</Text>
          </View>
          <Text style={styles.modalTitle}>Enable GPS Location</Text>
          <Text style={styles.modalDesc}>
            {role === 'driver'
              ? 'College Bus Track uses your GPS coordinates to provide students with accurate live bus tracking, real-time stop arrival estimates, and emergency response coordinates.'
              : 'Allow College Bus Track to detect your live position so you can navigate to your assigned boarding stop and see how close your bus is.'}
          </Text>

          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>&bull; High-accuracy live telemetry</Text>
            <Text style={styles.bulletItem}>&bull; Low battery consumption protocol</Text>
            <Text style={styles.bulletItem}>&bull; Privacy protected & encrypted telemetry</Text>
          </View>

          <TouchableOpacity style={styles.modalAllowBtn} onPress={handleRequest}>
            <Text style={styles.modalAllowText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
            <Text style={styles.modalCancelText}>Not Now / Continue in Simulation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
  },
  grantedDot: {
    fontSize: 10,
  },
  grantedText: {
    color: '#34d399',
    fontWeight: '700',
    fontSize: 12,
  },
  bannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  bulletList: {
    alignSelf: 'stretch',
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
    gap: 6,
  },
  bulletItem: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  modalAllowBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAllowText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCancelBtn: {
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
