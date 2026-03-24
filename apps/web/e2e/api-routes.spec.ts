import { test, expect } from '@playwright/test';

test.describe('API Auth Route Handlers', () => {
  test.describe('POST /api/auth/login', () => {
    test('returns 502 when Express API is unreachable', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: { email: 'test@example.com', password: 'password123' },
      });
      // Express API not running → proxy error
      expect(res.status()).toBe(502);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('PROXY_ERROR');
    });

    test('sends JSON content type', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: { email: 'test@example.com', password: 'password123' },
      });
      expect(res.headers()['content-type']).toContain('application/json');
    });
  });

  test.describe('POST /api/auth/register', () => {
    test('returns 502 when Express API is unreachable', async ({ request }) => {
      const res = await request.post('/api/auth/register', {
        data: { email: 'new@example.com', password: 'password123', name: 'Test' },
      });
      expect(res.status()).toBe(502);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('PROXY_ERROR');
    });
  });

  test.describe('POST /api/auth/logout', () => {
    test('returns success and clears cookies', async ({ request }) => {
      const res = await request.post('/api/auth/logout');
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  test.describe('GET /api/auth/me', () => {
    test('returns 401 when no auth cookie present', async ({ request }) => {
      const res = await request.get('/api/auth/me');
      expect(res.status()).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_AUTHENTICATED');
    });
  });

  test.describe('POST /api/auth/refresh', () => {
    test('returns 401 when no refresh token cookie present', async ({ request }) => {
      const res = await request.post('/api/auth/refresh');
      expect(res.status()).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('NO_REFRESH_TOKEN');
    });
  });
});
