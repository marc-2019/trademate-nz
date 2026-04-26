'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { authClient, subscriptionsClient, ApiError } from '@/lib/api-client';
import type { User, SubscriptionInfo, TierUsage, TierLimits } from '@bossboard/shared';
import { Smartphone } from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('en-NZ', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string | Date | null) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

const tierLabel: Record<string, string> = {
  free: 'Free',
  tradie: 'Tradie',
  team: 'Team',
};

const tierBlurb: Record<string, string> = {
  free: '3 invoices and 2 SWMS per month, single user.',
  tradie: 'Unlimited invoices and SWMS, AI hazard ID, PDF + email exports.',
  team: 'Everything in Tradie, plus up to 5 team members.',
};

function formatLimit(n: number | null) {
  return n === null ? 'Unlimited' : String(n);
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<TierUsage | null>(null);
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    authClient
      .me()
      .then((data) => {
        if (!cancelled) setUser((data as { user: User }).user);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load profile.');
      });

    subscriptionsClient.me().then((d) => !cancelled && setSubscription(d.subscription)).catch(() => {});
    subscriptionsClient.usage().then((d) => !cancelled && setUsage(d.usage)).catch(() => {});
    subscriptionsClient.limits().then((d) => !cancelled && setLimits(d.limits)).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {error && (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Profile
        </h2>
        {user ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Name" value={user.name || '—'} />
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone || '—'} />
            <Field label="Trade type" value={user.tradeType ? user.tradeType : '—'} />
            <Field label="Business name" value={user.businessName || '—'} />
            <Field label="Verified" value={user.isVerified ? 'Yes' : 'No'} />
          </dl>
        ) : (
          <p className="text-sm text-gray-500 py-4">Loading profile…</p>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Editing your profile is currently done in the BossBoard mobile app.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Subscription
        </h2>
        {subscription ? (
          <>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-light">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {tierLabel[subscription.tier] || subscription.tier}
                </p>
                <p className="text-sm text-gray-600">{tierBlurb[subscription.tier] || ''}</p>
              </div>
              {subscription.expiresAt && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Renews</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(subscription.expiresAt)}
                  </p>
                </div>
              )}
            </div>

            {limits && usage && (
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <UsageStat
                  label="Invoices this month"
                  used={usage.invoicesThisMonth}
                  cap={limits.invoicesPerMonth}
                />
                <UsageStat
                  label="SWMS this month"
                  used={usage.swmsThisMonth}
                  cap={limits.swmsPerMonth}
                />
                <UsageStat
                  label="Team members"
                  used={usage.teamMemberCount}
                  cap={limits.teamMembers}
                />
              </dl>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 py-4">Loading subscription…</p>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Plan changes and billing are currently managed in the BossBoard mobile app.
        </p>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Smartphone size={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Get the BossBoard app</h2>
            <p className="text-sm text-gray-600 mt-1">
              Day-to-day work — creating invoices, capturing photos, generating SWMS, clocking
              in to jobs — happens in the mobile app. Web is for reviewing your account from a
              desktop. App Store + Google Play release coming soon.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function UsageStat({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number | null;
}) {
  const text = cap === null ? `${used}` : `${used} / ${cap}`;
  return (
    <div className="rounded-lg border border-border-light p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900 mt-0.5">{text}</p>
      <p className="text-xs text-gray-500 mt-0.5">{formatLimit(cap) === 'Unlimited' ? 'Unlimited' : `Cap ${formatLimit(cap)}`}</p>
    </div>
  );
}
