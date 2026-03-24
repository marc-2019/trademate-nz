import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/constants';
import { getRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'NO_REFRESH_TOKEN', message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      await clearAuthCookies();
      return NextResponse.json(json, { status: res.status });
    }

    const { accessToken, refreshToken: newRefresh } = json.data.tokens;
    await setAuthCookies(accessToken, newRefresh);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'PROXY_ERROR', message: 'Failed to refresh token' },
      { status: 502 },
    );
  }
}
