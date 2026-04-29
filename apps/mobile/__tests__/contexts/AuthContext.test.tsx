/**
 * AuthContext.logout() — JWT clear assertion
 *
 * Verifies that logout() removes the persisted access token from SecureStore.
 * Mocks SecureStore.deleteItemAsync and asserts it's called with the access
 * token key ('bossboard_access_token').
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

const TOKEN_KEY = 'bossboard_access_token';
const REFRESH_KEY = 'bossboard_refresh_token';
const USER_KEY = 'bossboard_user';

const mockStore: Record<string, string> = {};

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// AuthContext imports SecureStore via `../utils/storage`, which is a
// platform-aware wrapper that delegates to expo-secure-store on native.
// Mocking the wrapper is equivalent to mocking SecureStore itself for the
// purposes of this test — the same deleteItemAsync(key) contract applies.
jest.mock('../../src/utils/storage', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../src/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  setAuthToken: jest.fn(),
  notificationsApi: {
    removePushToken: jest.fn(),
  },
}));

import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import * as storage from '../../src/utils/storage';
import { api, notificationsApi } from '../../src/services/api';

const mockGetItem = storage.getItemAsync as jest.Mock;
const mockSetItem = storage.setItemAsync as jest.Mock;
const mockDeleteItem = storage.deleteItemAsync as jest.Mock;
const mockApiGet = (api as any).get as jest.Mock;
const mockApiPost = (api as any).post as jest.Mock;
const mockRemovePushToken = (notificationsApi as any).removePushToken as jest.Mock;

const seededUser = {
  id: 'user-1',
  email: 'logout-test@example.com',
  name: 'Logout Test',
  phone: null,
  tradeType: 'plumber',
  businessName: null,
  isVerified: true,
  onboardingCompleted: true,
  subscriptionTier: 'free' as const,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  jest.clearAllMocks();

  mockGetItem.mockImplementation(async (key: string) => mockStore[key] ?? null);
  mockSetItem.mockImplementation(async (key: string, value: string) => {
    mockStore[key] = value;
  });
  mockDeleteItem.mockImplementation(async (key: string) => {
    delete mockStore[key];
  });

  mockRemovePushToken.mockResolvedValue(undefined);
});

describe('AuthContext.logout()', () => {
  it('calls SecureStore.deleteItemAsync with the access token key', async () => {
    // Seed an authenticated session so logout() has something to clear
    mockStore[TOKEN_KEY] = 'jwt-access-token';
    mockStore[REFRESH_KEY] = 'jwt-refresh-token';
    mockStore[USER_KEY] = JSON.stringify(seededUser);

    mockApiGet.mockResolvedValueOnce({ data: { success: true, data: { user: seededUser } } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    // Logout API succeeds — but logout should clear storage even if it fails
    mockApiPost.mockResolvedValueOnce({ data: { success: true } });

    // Reset only the deleteItemAsync mock so we observe calls made by logout()
    // (loadStoredAuth and other lifecycle code don't call deleteItemAsync on
    // the happy path, but clearing keeps the assertion unambiguous)
    mockDeleteItem.mockClear();

    await act(async () => {
      await result.current.logout();
    });

    // The core assertion: the JWT access token key was deleted from SecureStore
    expect(mockDeleteItem).toHaveBeenCalledWith(TOKEN_KEY);

    // And the in-memory store reflects the deletion
    expect(mockStore[TOKEN_KEY]).toBeUndefined();
  });
});
