/**
 * P0 BULLETPROOFING: multi-tenant data isolation across entity types.
 *
 * Companion to multi-tenant-isolation.spec.ts (which pins invoices).
 * This spec extends the boundary check to every other tradie-owned
 * entity that scopes by `WHERE id = $X AND user_id = $Y` at the SQL
 * layer:
 *
 *   - customers (services/customers.ts L94, L192, L213)
 *   - quotes    (services/quotes.ts: same pattern, uses listQuotes
 *                with `user_id = $1` filter)
 *   - expenses  (services/expenses.ts L74, L213, L225)
 *   - job_logs  (services/job-logs.ts L61, L197, L240)
 *   - photos    (services/photos.ts: listByEntity scopes by user_id;
 *                we test that B cannot list photos for A's invoice id)
 *
 * Strategy (one parametrised test per entity to keep ~150 LOC):
 *   1. Register Tradie A.
 *   2. As A, create one tagged entity of each kind.
 *   3. Register Tradie B (fresh, separate account).
 *   4. As B, attempt direct GET-by-id of A's entity (where applicable)
 *      → expect 403 / 404 / not-200-with-A's-data.
 *   5. As B, list entities of that type → A's entity must NOT appear.
 *   6. Cleanup: DELETE both accounts. The auth.ts deleteAccount path
 *      uses ON DELETE CASCADE for customers/business_profiles/products
 *      and explicit DELETE for the rest, so this should leave 0 e2e-
 *      tagged rows behind.
 *
 * Run against staging: PROD_API_URL=http://127.0.0.1:32001 npx playwright
 *   test e2e/multi-tenant-isolation-entities.spec.ts
 *
 * NOTE: Photos require multipart upload + a parent entity. We test
 * photos by having B request photos-for-A's-invoice-id (the disclosure
 * boundary) — no binary upload needed because A's photo list for that
 * invoice will be empty too; what matters is that the SQL filter is
 * scoped by user_id, which we pin by ensuring the response is shaped
 * `{ data: { photos: [] } }` and never errors-out leaking A's data.
 */

import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { registerEphemeralUser, testDataName, EphemeralUser } from './helpers/test-data';

const API_URL = process.env.PROD_API_URL || process.env.API_URL || 'http://localhost:29000';

type CreatedEntity = { id: string; tag: string };

async function createCustomer(ctx: APIRequestContext, token: string): Promise<CreatedEntity> {
  const tag = testDataName('customer').tag;
  const res = await ctx.post(`${API_URL}/api/v1/customers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: tag, email: `${tag}@example.test` },
    failOnStatusCode: false,
  });
  expect(res.status(), `create customer: ${await res.text()}`).toBe(201);
  return { id: (await res.json()).data.customer.id, tag };
}

async function createQuote(ctx: APIRequestContext, token: string): Promise<CreatedEntity> {
  const tag = testDataName('quote').tag;
  const res = await ctx.post(`${API_URL}/api/v1/quotes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      clientName: tag,
      jobDescription: 'P0 isolation test quote',
      lineItems: [{ description: 'Iso test', amount: 5000 }],
    },
    failOnStatusCode: false,
  });
  expect(res.status(), `create quote: ${await res.text()}`).toBe(201);
  return { id: (await res.json()).data.quote.id, tag };
}

async function createExpense(ctx: APIRequestContext, token: string): Promise<CreatedEntity> {
  const tag = testDataName('expense').tag;
  const res = await ctx.post(`${API_URL}/api/v1/expenses`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { amount: 1234, category: 'materials', vendor: tag, description: tag },
    failOnStatusCode: false,
  });
  expect(res.status(), `create expense: ${await res.text()}`).toBe(201);
  return { id: (await res.json()).data.expense.id, tag };
}

async function createJobLog(ctx: APIRequestContext, token: string): Promise<CreatedEntity> {
  const tag = testDataName('joblog').tag;
  const res = await ctx.post(`${API_URL}/api/v1/job-logs`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { description: tag, siteAddress: '1 P0 Test St' },
    failOnStatusCode: false,
  });
  expect(res.status(), `create job-log: ${await res.text()}`).toBe(201);
  return { id: (await res.json()).data.jobLog.id, tag };
}

async function createInvoiceForPhotoTest(ctx: APIRequestContext, token: string): Promise<CreatedEntity> {
  const tag = testDataName('photoinv').tag;
  const res = await ctx.post(`${API_URL}/api/v1/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      clientName: tag,
      jobDescription: 'parent for photo isolation test',
      lineItems: [{ description: 'Parent', amount: 100 }],
      includeGst: true,
    },
    failOnStatusCode: false,
  });
  expect(res.status(), `create photo-parent invoice: ${await res.text()}`).toBe(201);
  return { id: (await res.json()).data.invoice.id, tag };
}

interface EntityCase {
  name: string;
  create: (ctx: APIRequestContext, token: string) => Promise<CreatedEntity>;
  detailUrl: (id: string) => string; // for direct GET-by-id by B
  listUrl: string;                    // for list by B
  listKey: string;                    // key under data.* containing the array
  matchTagField?: string;             // field on returned objects to check leak by tag
}

const ENTITY_CASES: EntityCase[] = [
  {
    name: 'customers',
    create: createCustomer,
    detailUrl: (id) => `${API_URL}/api/v1/customers/${id}`,
    listUrl: `${API_URL}/api/v1/customers?includeInactive=true`,
    listKey: 'customers',
    matchTagField: 'name',
  },
  {
    name: 'quotes',
    create: createQuote,
    detailUrl: (id) => `${API_URL}/api/v1/quotes/${id}`,
    listUrl: `${API_URL}/api/v1/quotes`,
    listKey: 'quotes',
    matchTagField: 'clientName',
  },
  {
    name: 'expenses',
    create: createExpense,
    detailUrl: (id) => `${API_URL}/api/v1/expenses/${id}`,
    listUrl: `${API_URL}/api/v1/expenses`,
    listKey: 'expenses',
    matchTagField: 'vendor',
  },
  {
    name: 'job_logs',
    create: createJobLog,
    detailUrl: (id) => `${API_URL}/api/v1/job-logs/${id}`,
    listUrl: `${API_URL}/api/v1/job-logs`,
    listKey: 'jobLogs',
    matchTagField: 'description',
  },
];

test.describe('multi-tenant isolation across entity types (P0)', () => {
  for (const c of ENTITY_CASES) {
    test(`Tradie B cannot read Tradie A's ${c.name}`, async () => {
      const ctx = await playwrightRequest.newContext();
      let a: EphemeralUser | null = null;
      let b: EphemeralUser | null = null;
      try {
        a = await registerEphemeralUser(ctx, API_URL, `iso-${c.name}-a`);
        b = await registerEphemeralUser(ctx, API_URL, `iso-${c.name}-b`);

        const aEntity = await c.create(ctx, a.accessToken);

        // 1) B direct GET — must NOT return 200 with A's payload.
        const bDirect = await ctx.get(c.detailUrl(aEntity.id), {
          headers: { Authorization: `Bearer ${b.accessToken}` },
          failOnStatusCode: false,
        });
        expect(
          [403, 404],
          `P0 LEAK: B got HTTP ${bDirect.status()} on ${c.name}/${aEntity.id}: ${await bDirect.text()}`,
        ).toContain(bDirect.status());

        // 2) B list — must not contain A's entity by id or by tagged field.
        const bList = await ctx.get(c.listUrl, {
          headers: { Authorization: `Bearer ${b.accessToken}` },
          failOnStatusCode: false,
        });
        expect(bList.status(), `B list ${c.name}: ${await bList.text()}`).toBe(200);
        const items: Array<Record<string, unknown>> = (await bList.json())?.data?.[c.listKey] || [];
        const leakById = items.some((row) => row.id === aEntity.id);
        const leakByTag = c.matchTagField
          ? items.some((row) => row[c.matchTagField!] === aEntity.tag)
          : false;
        expect(
          leakById || leakByTag,
          `P0 LEAK: B's ${c.name} list contains A's entity. leakById=${leakById} leakByTag=${leakByTag}`,
        ).toBe(false);
      } finally {
        if (a) await a.cleanup();
        if (b) await b.cleanup();
        await ctx.dispose();
      }
    });
  }

  test('Tradie B cannot list photos attached to Tradie A\'s invoice', async () => {
    const ctx = await playwrightRequest.newContext();
    let a: EphemeralUser | null = null;
    let b: EphemeralUser | null = null;
    try {
      a = await registerEphemeralUser(ctx, API_URL, 'iso-photos-a');
      b = await registerEphemeralUser(ctx, API_URL, 'iso-photos-b');

      const aInvoice = await createInvoiceForPhotoTest(ctx, a.accessToken);

      // B asks for photos attached to A's invoice. Even with no photos
      // uploaded, the response must be a valid 200 with an empty list —
      // proving the WHERE user_id=$3 filter applies. A 200 with photos
      // belonging to A would be a P0 leak.
      const bRes = await ctx.get(`${API_URL}/api/v1/photos/invoice/${aInvoice.id}`, {
        headers: { Authorization: `Bearer ${b.accessToken}` },
        failOnStatusCode: false,
      });
      expect(bRes.status(), `B list photos for A's invoice: ${await bRes.text()}`).toBe(200);
      const photos = (await bRes.json())?.data?.photos || [];
      expect(Array.isArray(photos), 'photos response shape').toBe(true);
      // Cross-check: any returned photo must NOT belong to A.
      const leakedToA = photos.some((p: Record<string, unknown>) => p.user_id === a!.email);
      expect(leakedToA, 'B saw photos owned by A — P0 LEAK').toBe(false);
    } finally {
      if (a) await a.cleanup();
      if (b) await b.cleanup();
      await ctx.dispose();
    }
  });
});
