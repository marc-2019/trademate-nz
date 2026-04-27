/**
 * P0 BULLETPROOFING: multi-tenant data isolation.
 *
 * BossBoard scopes invoices (and every other tradie-owned entity) by
 * `user_id` at the SQL layer (apps/api/src/services/invoices.ts:
 * "WHERE id = $1 AND user_id = $2"). If that scope ever regresses,
 * Tradie A's customer list / invoices / financials become visible to
 * Tradie B — a P0 disclosure incident under the NZ Privacy Act 2020.
 *
 * This test pins that boundary:
 *   1. Register Tradie A → create an invoice under A's account.
 *   2. Register Tradie B (fresh, separate account).
 *   3. As Tradie B, attempt to GET A's invoice by id → expect 404.
 *   4. As Tradie B, list invoices → expect A's invoice NOT in the list.
 *   5. Cleanup: DELETE both accounts via /api/v1/auth/account.
 *
 * Mirrors the pattern in MOSS
 * (Instilligent.Moss.E2ETests/Tests/MultiTenantIsolationTests.cs:
 * `CompanyB_CannotSee_CompanyA_Vessel`) but at the API layer because
 * BossBoard's web UI is still being built out — testing at the API
 * pins the actual disclosure boundary that the mobile app + web both
 * depend on.
 *
 * All entities use the e2e- prefix from helpers/test-data.ts so the
 * cleanup-by-regex sweep (cf_standing_directives.e2e-test-data-lifecycle)
 * collects anything left behind.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { registerEphemeralUser, testDataName } from './helpers/test-data';

const API_URL = process.env.PROD_API_URL || process.env.API_URL || 'http://localhost:29000';

test.describe('multi-tenant isolation (P0)', () => {
  test('Tradie B cannot read Tradie A\'s invoice via GET by id or via list', async () => {
    // Use a dedicated request context so we control auth headers per-call
    // (the default `request` fixture would carry cookies between calls).
    const apiRequest = await playwrightRequest.newContext();

    let tradieA: Awaited<ReturnType<typeof registerEphemeralUser>> | null = null;
    let tradieB: Awaited<ReturnType<typeof registerEphemeralUser>> | null = null;

    try {
      // ============ Tradie A: register + create invoice ============
      tradieA = await registerEphemeralUser(apiRequest, API_URL, 'tenantA');

      const invoiceTag = testDataName('invoice');
      const createRes = await apiRequest.post(`${API_URL}/api/v1/invoices`, {
        headers: { Authorization: `Bearer ${tradieA.accessToken}` },
        data: {
          clientName: invoiceTag.tag, // tagged so cleanup sweep can find it
          clientEmail: invoiceTag.email,
          jobDescription: 'P0 isolation test — Tradie A only',
          lineItems: [{ description: 'Isolation test work', amount: 12345 }],
          includeGst: true,
        },
        failOnStatusCode: false,
      });
      expect(createRes.status(), `create invoice as A: ${await createRes.text()}`).toBe(201);
      const createdBody = await createRes.json();
      const invoiceA = createdBody?.data?.invoice;
      expect(invoiceA, 'invoice payload missing').toBeTruthy();
      const invoiceAId: string = invoiceA.id;
      expect(invoiceAId, 'invoice id missing').toBeTruthy();

      // Sanity: Tradie A CAN read their own invoice (proves the API is up
      // and the isolation we'll observe for B isn't just a 404-everything).
      const aSelfRead = await apiRequest.get(`${API_URL}/api/v1/invoices/${invoiceAId}`, {
        headers: { Authorization: `Bearer ${tradieA.accessToken}` },
        failOnStatusCode: false,
      });
      expect(aSelfRead.status(), 'A should be able to read own invoice').toBe(200);

      // ============ Tradie B: register fresh, separate account ============
      tradieB = await registerEphemeralUser(apiRequest, API_URL, 'tenantB');

      // ============ Assertion 1: B cannot GET A's invoice by id ============
      const bDirectAccess = await apiRequest.get(`${API_URL}/api/v1/invoices/${invoiceAId}`, {
        headers: { Authorization: `Bearer ${tradieB.accessToken}` },
        failOnStatusCode: false,
      });
      // Acceptable: 404 (preferred — doesn't even confirm existence) or
      // 403 (forbidden). UNACCEPTABLE: 200 with the invoice body.
      expect(
        [403, 404],
        `P0 DATA LEAK: Tradie B got HTTP ${bDirectAccess.status()} when reading Tradie A's invoice ${invoiceAId}. ` +
          `Body: ${await bDirectAccess.text()}`,
      ).toContain(bDirectAccess.status());

      // ============ Assertion 2: B's invoice list does not contain A's invoice ============
      const bList = await apiRequest.get(`${API_URL}/api/v1/invoices`, {
        headers: { Authorization: `Bearer ${tradieB.accessToken}` },
        failOnStatusCode: false,
      });
      expect(bList.status(), `B list invoices: ${await bList.text()}`).toBe(200);
      const bListBody = await bList.json();
      const bInvoices: Array<{ id: string; clientName?: string }> =
        bListBody?.data?.invoices || bListBody?.data || [];

      // Cross-check by id AND by tagged client name — either match would
      // be a leak.
      const leakById = bInvoices.some((inv) => inv.id === invoiceAId);
      const leakByName = bInvoices.some((inv) => inv.clientName === invoiceTag.tag);
      expect(
        leakById || leakByName,
        `P0 DATA LEAK: Tradie B's invoice list contains Tradie A's invoice. ` +
          `leakById=${leakById} leakByName=${leakByName}. List=${JSON.stringify(bInvoices)}`,
      ).toBe(false);
    } finally {
      // Cleanup: DELETE both accounts. Belt-and-braces — even if these
      // throw, the global cleanup sweep on e2e- prefix will catch them.
      if (tradieA) await tradieA.cleanup();
      if (tradieB) await tradieB.cleanup();
      await apiRequest.dispose();
    }
  });
});
