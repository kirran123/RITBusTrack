import React, { useEffect, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { authStorage } from '../services/authStorage';

// Prevent the splash screen from auto-hiding until we're done loading
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

const { width: SCREEN_W } = Dimensions.get('window');

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
    console.warn('[BusTrack] Caught error:', error?.message || String(error));
  }

  handleReset = async () => {
    try {
      await authStorage.clearSession();
    } catch {}
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error
        ? String(this.state.error.message || this.state.error.name || this.state.error)
        : 'Unknown error';
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>🚌</Text>
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSub}>
            A rendering error occurred. Tap below to reload the app.
          </Text>
          {errorMsg ? (
            <View style={styles.errorDetailBox}>
              <Text style={styles.errorDetailText} numberOfLines={3}>
                {errorMsg}
              </Text>
            </View>
          ) : null}
          <View style={styles.errorButtonRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: undefined })}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>🔄 Reload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryButton, styles.resetButton]}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>🏠 Reset</Text>
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
    // Give the JS bundle 80ms to settle then safely hide the splash
    const timer = setTimeout(() => {
      try {
        SplashScreen.hideAsync().catch(() => {});
      } catch {}
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#090d16" translucent={false} />
        <MobileErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#090d16' },
              animation: 'fade',
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
    padding: 28,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorIconText: {
    fontSize: 32,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorDetailBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    maxWidth: SCREEN_W - 56,
  },
  errorDetailText: {
    color: '#f87171',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  resetButton: {
    backgroundColor: '#334155',
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
