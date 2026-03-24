import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/constants';
import { setAuthCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return NextResponse.json(json, { status: res.status });
    }

    // Set httpOnly cookies with the tokens
    const { accessToken, refreshToken } = json.data.tokens;
    await setAuthCookies(accessToken, refreshToken);

    // Return user data (but not tokens — they're in cookies now)
    return NextResponse.json({
      success: true,
      data: { user: json.data.user },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'PROXY_ERROR', message: 'Failed to connect to API' },
      { status: 502 },
    );
  }
}
