import React, { useEffect, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

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
    console.warn('Mobile App Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🚌</Text>
          <Text style={styles.errorTitle}>Application Restored</Text>
          <Text style={styles.errorSub}>
            A minor UI rendering notice occurred. Tap below to refresh your view smoothly.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retryButtonText}>🔄 Reload Screen</Text>
          </TouchableOpacity>
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
});
