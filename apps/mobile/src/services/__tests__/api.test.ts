/**
 * API Service Tests
 * Tests token management and error classes
 */

// Mock expo-constants before importing
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { apiUrl: 'http://test-api:29000' } },
  },
}));

import {
  setAuthToken,
  getAuthToken,
  NetworkError,
  TimeoutError,
  ApiError,
} from '../api';

beforeEach(() => {
  setAuthToken(null);
});

describe('API Service', () => {
  describe('Token Management', () => {
    it('should start with null token', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('should set and get auth token', () => {
      setAuthToken('test-token-123');
      expect(getAuthToken()).toBe('test-token-123');
    });

    it('should clear token when set to null', () => {
      setAuthToken('some-token');
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('Error Classes', () => {
    describe('NetworkError', () => {
      it('should create with message and default code', () => {
        const error = new NetworkError('Connection failed');
        expect(error.message).toBe('Connection failed');
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.name).toBe('NetworkError');
        expect(error).toBeInstanceOf(Error);
      });

      it('should accept custom code', () => {
        const error = new NetworkError('DNS failed', 'DNS_ERROR');
        expect(error.code).toBe('DNS_ERROR');
      });
    });

    describe('TimeoutError', () => {
      it('should create with default message', () => {
        const error = new TimeoutError();
        expect(error.message).toBe('Request timeout');
        expect(error.name).toBe('TimeoutError');
      });

      it('should accept custom message', () => {
        const error = new TimeoutError('Took too long');
        expect(error.message).toBe('Took too long');
      });
    });

    describe('ApiError', () => {
      it('should create with message, status, and code', () => {
        const error = new ApiError('Not found', 404, 'NOT_FOUND');
        expect(error.message).toBe('Not found');
        expect(error.status).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.name).toBe('ApiError');
      });

      it('should default code to API_ERROR', () => {
        const error = new ApiError('Server error', 500);
        expect(error.code).toBe('API_ERROR');
      });
    });
  });
});
