/**
 * Client-side API client.
 * Calls Next.js API routes (which proxy to Express).
 * Used in client components — tokens never touch the browser.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function clientFetch<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const res = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(
      res.status,
      json.error || 'UNKNOWN_ERROR',
      json.message || 'An error occurred',
    );
  }

  return json.data as T;
}

/** Auth API (calls Next.js proxy routes, not Express directly) */
export const authClient = {
  login: (email: string, password: string) =>
    clientFetch('/api/auth/login', { method: 'POST', body: { email, password } }),

  register: (data: { email: string; password: string; name?: string }) =>
    clientFetch('/api/auth/register', { method: 'POST', body: data }),

  logout: () =>
    clientFetch('/api/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    clientFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    clientFetch('/api/auth/reset-password', { method: 'POST', body: data }),

  me: () =>
    clientFetch<{ user: import('@bossboard/shared').User }>('/api/auth/me'),
};

/** Invoices API (read-only first ship — list + detail + share link).
 *  Send / email / PDF actions are intentionally out of scope for the v1
 *  web view; tradies do those flows in the BossBoard mobile app. */
export const invoicesClient = {
  list: () =>
    clientFetch<{ invoices: import('@bossboard/shared').Invoice[] }>('/api/invoices'),

  get: (id: string) =>
    clientFetch<{ invoice: import('@bossboard/shared').Invoice }>(`/api/invoices/${id}`),

  share: (id: string) =>
    clientFetch<{ shareToken: string; shareUrl: string }>(
      `/api/invoices/${id}/share`,
      { method: 'POST' },
    ),
};
