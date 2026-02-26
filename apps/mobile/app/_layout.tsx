/**
 * Root Layout
 * Provides auth context and navigation structure
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useNotifications } from '../src/hooks/useNotifications';
import { View, ActivityIndicator } from 'react-native';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register for push notifications when authenticated
  useNotifications(isAuthenticated);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // Check if user needs verification or onboarding
      if (!user?.isVerified) {
        // Need email verification - only redirect if not already on verify screen
        if ((segments[1] as string) !== 'verify-email') {
          router.replace('/(auth)/verify-email' as any);
        }
      } else if (!user?.onboardingCompleted) {
        // Need onboarding - only redirect if not already on onboarding screen
        if ((segments[1] as string) !== 'onboarding') {
          router.replace('/(auth)/onboarding' as any);
        }
      } else {
        // Fully set up - go to tabs
        router.replace('/(tabs)' as any);
      }
    } else if (isAuthenticated && !inAuthGroup) {
      // Authenticated and in app - check if they still need verification/onboarding
      if (!user?.isVerified) {
        router.replace('/(auth)/verify-email' as any);
      } else if (!user?.onboardingCompleted) {
        router.replace('/(auth)/onboarding' as any);
      }
    }
  }, [isAuthenticated, user?.isVerified, user?.onboardingCompleted, segments, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="swms/[id]"
        options={{
          headerShown: true,
          title: 'SWMS Document',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="swms/generate"
        options={{
          headerShown: true,
          title: 'Generate SWMS',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Invoices */}
      <Stack.Screen
        name="invoices/create"
        options={{
          headerShown: true,
          title: 'New Invoice',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="invoices/[id]"
        options={{
          headerShown: true,
          title: 'Invoice',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Quotes */}
      <Stack.Screen
        name="quotes/index"
        options={{
          headerShown: true,
          title: 'Quotes',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="quotes/create"
        options={{
          headerShown: true,
          title: 'New Quote',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="quotes/[id]"
        options={{
          headerShown: true,
          title: 'Quote',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Expenses */}
      <Stack.Screen
        name="expenses/index"
        options={{
          headerShown: true,
          title: 'Expenses',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="expenses/create"
        options={{
          headerShown: true,
          title: 'New Expense',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="expenses/[id]"
        options={{
          headerShown: true,
          title: 'Expense',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Jobs */}
      <Stack.Screen
        name="jobs/index"
        options={{
          headerShown: true,
          title: 'Job Logs',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="jobs/create"
        options={{
          headerShown: true,
          title: 'New Job',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="jobs/[id]"
        options={{
          headerShown: true,
          title: 'Job Details',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Settings */}
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: 'Settings',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Settings sub-screens */}
      <Stack.Screen
        name="settings/profile"
        options={{
          headerShown: true,
          title: 'Profile',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="settings/business-profile"
        options={{
          headerShown: true,
          title: 'Business Details',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="settings/bank-details"
        options={{
          headerShown: true,
          title: 'Bank Details',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Subscription */}
      <Stack.Screen
        name="subscription"
        options={{
          headerShown: true,
          title: 'Subscription',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Certifications */}
      <Stack.Screen
        name="certifications/add"
        options={{
          headerShown: true,
          title: 'Add Certification',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Customers */}
      <Stack.Screen
        name="customers/index"
        options={{
          headerShown: true,
          title: 'Customers',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="customers/create"
        options={{
          headerShown: true,
          title: 'Add Customer',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="customers/[id]"
        options={{
          headerShown: true,
          title: 'Customer Details',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Products */}
      <Stack.Screen
        name="products/index"
        options={{
          headerShown: true,
          title: 'Products & Services',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="products/create"
        options={{
          headerShown: true,
          title: 'Add Product',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Recurring Invoices */}
      <Stack.Screen
        name="recurring/index"
        options={{
          headerShown: true,
          title: 'Recurring Invoices',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="recurring/create"
        options={{
          headerShown: true,
          title: 'New Recurring Invoice',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="recurring/[id]"
        options={{
          headerShown: true,
          title: 'Recurring Invoice',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="recurring/generate"
        options={{
          headerShown: true,
          title: 'Generate Invoice',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Teams */}
      <Stack.Screen
        name="teams/index"
        options={{
          headerShown: true,
          title: 'Team',
          headerTintColor: '#2563EB',
        }}
      />
      {/* Bank Reconciliation */}
      <Stack.Screen
        name="bank/index"
        options={{
          headerShown: true,
          title: 'Bank Transactions',
          headerTintColor: '#2563EB',
        }}
      />
      <Stack.Screen
        name="bank/upload"
        options={{
          headerShown: true,
          title: 'Upload CSV',
          headerTintColor: '#2563EB',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
