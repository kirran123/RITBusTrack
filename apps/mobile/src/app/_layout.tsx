import React, { useEffect, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { authStorage } from '../services/authStorage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MobileErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('Mobile App Caught Error:', error?.message || error, errorInfo);
  }

  handleReset = async () => {
    try {
      await authStorage.clearSession();
    } catch {}
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🚌</Text>
          <Text style={styles.errorTitle}>Application Restored</Text>
          <Text style={styles.errorSub}>
            A minor UI rendering notice occurred. Tap below to refresh your view smoothly.
          </Text>
          {this.state.error?.message ? (
            <View style={styles.errorDetailBox}>
              <Text style={styles.errorDetailText} numberOfLines={3}>
                {this.state.error.message}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: undefined })}
            >
              <Text style={styles.retryButtonText}>🔄 Reload Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: '#334155' }]}
              onPress={this.handleReset}
            >
              <Text style={styles.retryButtonText}>🏠 Reset View</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen smoothly once React tree mounts
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch {}
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <MobileErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: 'bold' },
              contentStyle: { backgroundColor: '#090d16' },
            }}
          />
        </MobileErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  errorSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  errorDetailBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    maxWidth: '90%',
  },
  errorDetailText: {
    color: '#f87171',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
