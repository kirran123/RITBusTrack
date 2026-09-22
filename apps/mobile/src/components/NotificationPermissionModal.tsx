import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface NotificationPermissionBannerProps {
  isGranted: boolean;
  onRequestPermission: () => void;
  onOpenDetails?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  isGranted,
  onRequestPermission,
  onOpenDetails,
}) => {
  if (isGranted) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 18 }}>🔔</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Push Notifications Disabled</Text>
        <Text style={styles.bannerSub}>
          Allow push notifications to receive live bus arrival notices, driver swaps, and transit announcements in your mobile notification bar.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.enableBtn}
        onPress={onRequestPermission}
        activeOpacity={0.8}
      >
        <Text style={styles.enableBtnText}>Enable</Text>
      </TouchableOpacity>
    </View>
  );
};

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onAllow: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onClose,
  onAllow,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconWrap}>
            <Text style={{ fontSize: 36 }}>🔔</Text>
          </View>
          <Text style={styles.modalTitle}>Enable Push Notifications</Text>
          <Text style={styles.modalDesc}>
            Stay informed about your campus transport in real-time. We deliver critical updates directly to your mobile status bar:
          </Text>

          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>&bull; 🚌 Live bus arrival alerts when within 500m / 5 mins</Text>
            <Text style={styles.bulletItem}>&bull; 🔄 Real-time standby bus and driver swap notices</Text>
            <Text style={styles.bulletItem}>&bull; 📢 Urgent campus route advisories and schedule changes</Text>
            <Text style={styles.bulletItem}>&bull; 🚨 Emergency SOS broadcasts and delay updates</Text>
          </View>

          <TouchableOpacity style={styles.modalAllowBtn} onPress={onAllow}>
            <Text style={styles.modalAllowText}>Turn On Push Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
            <Text style={styles.modalCancelText}>Remind Me Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#172554',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
  },
  bannerSub: {
    color: '#bfdbfe',
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  enableBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  enableBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
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
