/**
 * useNotifications Hook
 * Handles Expo push notification registration and token management
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsApi } from '../services/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and send token to API
 * Call this when the user is authenticated
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });

      await Notifications.setNotificationChannelAsync('cert-expiry', {
        name: 'Certification Expiry',
        description: 'Reminders when your certifications are about to expire',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
      });
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Hook to manage push notifications for the authenticated user
 */
export function useNotifications(isAuthenticated: boolean) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register and send token to API
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          await notificationsApi.registerPushToken(token);
          console.log('[Notifications] Token registered with API');
        } catch (error) {
          console.error('[Notifications] Failed to register token with API:', error);
        }
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received:', notification.request.content.title);
    });

    // Listen for notification taps (user interaction)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Tapped:', data);

      // Navigation based on notification type can be added here
      // e.g., navigate to certification detail when cert_expiry notification is tapped
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);
}
