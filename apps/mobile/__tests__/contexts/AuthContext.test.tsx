import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Tell React we're in an act-aware test environment so state updates
// inside AuthProvider's effects don't log spurious warnings.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// AuthContext imports SecureStore from a local wrapper at src/utils/storage,
// not directly from 'expo-secure-store'. Mock the wrapper so we can assert
// the exact keys the context deletes on logout.
jest.mock('../../src/utils/storage', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Mock the API module so logout() doesn't hit the network or push API.
jest.mock('../../src/services/api', () => ({
  api: {
    get: jest.fn(async () => ({ data: { success: false } })),
    post: jest.fn(async () => ({ data: { success: true } })),
    put: jest.fn(async () => ({ data: { success: false } })),
  },
  setAuthToken: jest.fn(),
  notificationsApi: {
    removePushToken: jest.fn(async () => undefined),
  },
}));

import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import * as Storage from '../../src/utils/storage';

describe('AuthContext.logout', () => {
  beforeEach(() => {
    (Storage.deleteItemAsync as jest.Mock).mockClear();
  });

  it('clears the persisted JWT and refresh token from SecureStore', async () => {
    let captured: ReturnType<typeof useAuth> | null = null;

    function Probe() {
      captured = useAuth();
      return null;
    }

    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    expect(captured).not.toBeNull();

    await act(async () => {
      await captured!.logout();
    });

    expect(Storage.deleteItemAsync).toHaveBeenCalledWith('bossboard_access_token');
    expect(Storage.deleteItemAsync).toHaveBeenCalledWith('bossboard_refresh_token');
    expect(Storage.deleteItemAsync).toHaveBeenCalledWith('bossboard_user');
  });
});
