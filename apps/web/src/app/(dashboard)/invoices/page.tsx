'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { invoicesClient, ApiError } from '@/lib/api-client';
import type { Invoice } from '@bossboard/shared';
import { FileText, ChevronRight } from 'lucide-react';

const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    invoicesClient
      .list()
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Could not load invoices.');
        }
        setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      {error && (
        <Card className="mb-4">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {invoices === null && !error && (
        <Card>
          <p className="text-sm text-gray-500 py-8 text-center">Loading invoices…</p>
        </Card>
      )}

      {invoices !== null && invoices.length === 0 && !error && (
        <Card>
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <FileText size={20} className="text-gray-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">No invoices yet</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Invoices you create in the BossBoard mobile app will appear here. The web view is
              read-only — you can review past invoices, share a link with a client, or open the
              full record. Create new invoices from the mobile app.
            </p>
          </div>
        </Card>
      )}

      {invoices && invoices.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-border-light">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {inv.invoiceNumber}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-sm text-gray-600 truncate">{inv.clientName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {nzd.format(inv.total)}
                    </div>
                    <div className="text-xs text-gray-500">Due {formatDate(inv.dueDate)}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
