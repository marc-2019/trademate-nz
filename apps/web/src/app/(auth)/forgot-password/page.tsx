'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Check your email</h1>
        <p className="text-gray-600 mb-6">
          If an account exists with <strong>{email}</strong>, we've sent a 6-digit code to reset your password.
        </p>
        <div className="space-y-4">
          <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="block">
            <Button className="w-full">Enter reset code</Button>
          </Link>
          <Button variant="ghost" onClick={() => setSuccess(false)} className="w-full">
            Try a different email
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Forgot password?</h1>
      <p className="text-gray-600 mb-6">
        Enter your email and we'll send you a 6-digit code to reset your password.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />
        <Button type="submit" loading={loading} className="w-full">
          Send reset code
        </Button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
