'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { invoicesClient, ApiError } from '@/lib/api-client';
import type { Invoice } from '@bossboard/shared';
import { ArrowLeft, Share2, Check } from 'lucide-react';

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

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    invoicesClient
      .get(id)
      .then((data) => {
        if (!cancelled) setInvoice(data.invoice);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Could not load invoice.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onShare = async () => {
    if (!id || shareBusy) return;
    setShareBusy(true);
    try {
      const data = await invoicesClient.share(id);
      setShareUrl(data.shareUrl);
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Clipboard may be blocked (insecure origin / no permission).
        // The URL is still shown in the panel for manual copy.
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not generate share link.');
      }
    } finally {
      setShareBusy(false);
    }
  };

  if (error && !invoice) {
    return (
      <div>
        <BackLink />
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <BackLink />
        <Card>
          <p className="text-sm text-gray-500 py-8 text-center">Loading invoice…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-600">
              Issued {formatDate(invoice.createdAt)} · Due {formatDate(invoice.dueDate)}
            </p>
          </div>
          <Button onClick={onShare} loading={shareBusy} variant="primary" size="md">
            <Share2 size={16} className="mr-2" />
            Share with client
          </Button>
        </div>

        {shareUrl && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-border-light">
            <div className="flex items-center gap-2 mb-1 text-sm text-gray-700">
              {copied ? (
                <>
                  <Check size={14} className="text-success" />
                  Link copied to clipboard
                </>
              ) : (
                <>Share link</>
              )}
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-accent break-all hover:underline"
            >
              {shareUrl}
            </a>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Client
          </h2>
          <p className="text-base text-gray-900 font-medium">{invoice.clientName}</p>
          {invoice.clientEmail && (
            <p className="text-sm text-gray-600 mt-1">{invoice.clientEmail}</p>
          )}
          {invoice.clientPhone && (
            <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            From
          </h2>
          <p className="text-base text-gray-900 font-medium">
            {invoice.companyName || '—'}
          </p>
          {invoice.companyAddress && (
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
              {invoice.companyAddress}
            </p>
          )}
          {invoice.gstNumber && (
            <p className="text-xs text-gray-500 mt-2">GST #: {invoice.gstNumber}</p>
          )}
        </Card>
      </div>

      {invoice.jobDescription && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Job description
          </h2>
          <p className="text-sm text-gray-800 whitespace-pre-line">{invoice.jobDescription}</p>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Line items
          </h2>
        </div>
        <ul className="divide-y divide-border-light">
          {invoice.lineItems.length === 0 && (
            <li className="px-6 py-4 text-sm text-gray-500">No line items.</li>
          )}
          {invoice.lineItems.map((item) => (
            <li key={item.id} className="px-6 py-3 flex items-start justify-between gap-4">
              <span className="text-sm text-gray-800">{item.description}</span>
              <span className="text-sm font-medium text-gray-900 shrink-0">
                {nzd.format(item.amount)}
              </span>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 border-t border-border-light bg-gray-50 space-y-1">
          <div className="flex justify-between text-sm text-gray-700">
            <span>Subtotal</span>
            <span>{nzd.format(invoice.subtotal)}</span>
          </div>
          {invoice.includeGst && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>GST (15%)</span>
              <span>{nzd.format(invoice.gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-gray-900 pt-1">
            <span>Total</span>
            <span>{nzd.format(invoice.total)}</span>
          </div>
        </div>
      </Card>

      {(invoice.bankAccountName || invoice.bankAccountNumber) && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pay to
          </h2>
          {invoice.bankAccountName && (
            <p className="text-sm text-gray-800">{invoice.bankAccountName}</p>
          )}
          {invoice.bankAccountNumber && (
            <p className="text-sm font-mono text-gray-800">{invoice.bankAccountNumber}</p>
          )}
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Notes
          </h2>
          <p className="text-sm text-gray-800 whitespace-pre-line">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/invoices"
      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
    >
      <ArrowLeft size={14} />
      Back to invoices
    </Link>
  );
}
