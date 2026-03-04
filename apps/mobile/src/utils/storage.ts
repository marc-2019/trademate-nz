/**
 * Platform-aware secure storage
 * Uses expo-secure-store on native, localStorage on web
 */
import { Platform } from 'react-native';

let SecureStore: any = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage might be full or disabled
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
