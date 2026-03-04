/**
 * useNotifications Hook
 * Handles Expo push notification registration and token management
 * Web-safe: notifications are a no-op on web platform
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { notificationsApi } from '../services/api';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

// Only load native notification modules on native platforms
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

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
}

/**
 * Register for push notifications and send token to API
 * Call this when the user is authenticated
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on native physical devices
  if (Platform.OS === 'web' || !Device?.isDevice) {
    console.log('[Notifications] Push notifications not available on this platform');
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
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
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
        lightColor: '#FF6B35',
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
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;

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
    notificationListenerRef.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[Notifications] Received:', notification.request.content.title);
    });

    // Listen for notification taps (user interaction)
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Tapped:', data);
    });

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [isAuthenticated]);
}
