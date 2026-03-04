/**
 * BossBoard Mobile App
 *
 * React Native (Expo) entry point.
 * Offline-first architecture with SQLite for local storage.
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// App configuration
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:29000';

interface AppState {
  isReady: boolean;
  isOnline: boolean;
  error: string | null;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    isReady: false,
    isOnline: true,
    error: null,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Check network status
        const networkState = await Network.getNetworkStateAsync();
        const isOnline = networkState.isConnected && networkState.isInternetReachable;

        // TODO: Initialize SQLite database
        // TODO: Load cached data
        // TODO: Check authentication status

        setState({
          isReady: true,
          isOnline: isOnline ?? false,
          error: null,
        });
      } catch (e) {
        console.error('App initialization error:', e);
        setState({
          isReady: true,
          isOnline: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!state.isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading BossBoard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Offline Banner */}
      {!state.isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline Mode - Changes will sync when connected
          </Text>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>BossBoard</Text>
        </View>

        {/* Welcome Message */}
        <Text style={styles.title}>Welcome to BossBoard</Text>
        <Text style={styles.subtitle}>
          Compliance & Cashflow for NZ Tradies
        </Text>

        {/* Feature Cards */}
        <View style={styles.featureContainer}>
          <FeatureCard
            title="Compliance"
            description="SWMS, Risk Assessments, WorkSafe Checklists"
            icon="📋"
            status="Coming Soon"
          />
          <FeatureCard
            title="Cashflow"
            description="Xero Integration, Invoice Chasing, GST Tracking"
            icon="💰"
            status="Q2 2026"
          />
          <FeatureCard
            title="Hiring"
            description="Visa Tracking, AEWV Compliance, Certifications"
            icon="👷"
            status="Q3 2026"
          />
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Status: {state.isOnline ? '🟢 Online' : '🟡 Offline'}
          </Text>
          <Text style={styles.versionText}>Version 0.1.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  status: string;
}

function FeatureCard({ title, description, icon, status }: FeatureCardProps) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
        <Text style={styles.featureStatus}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A2A44',
  },
  logoSubtext: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
  },
  featureContainer: {
    flex: 1,
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  featureStatus: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
