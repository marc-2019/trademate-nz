# TradeMate NZ - E2E Testing Matrix

**Version**: 1.0.0 | **Last Updated**: 2026-02-02 | **Coverage Target**: 80%

---

## Overview

This document tracks end-to-end test coverage for TradeMate NZ across all platforms and features.

---

## Platform Coverage

| Platform | Status | Framework | Notes |
|----------|--------|-----------|-------|
| iOS | Planned | Detox | iPhone 12+ |
| Android | Planned | Detox | Android 10+ |
| API | Planned | Jest + Supertest | All endpoints |

---

## Module 1: Compliance - Test Matrix

### SWMS Generator

| Test Case | Priority | iOS | Android | API | Status |
|-----------|----------|-----|---------|-----|--------|
| View available templates | P0 | [ ] | [ ] | [ ] | Planned |
| Select trade type | P0 | [ ] | [ ] | [ ] | Planned |
| Fill SWMS form | P0 | [ ] | [ ] | [ ] | Planned |
| AI hazard suggestions | P1 | [ ] | [ ] | [ ] | Planned |
| AI control measures | P1 | [ ] | [ ] | [ ] | Planned |
| Save draft SWMS | P0 | [ ] | [ ] | [ ] | Planned |
| Load saved SWMS | P0 | [ ] | [ ] | [ ] | Planned |
| Export to PDF | P0 | [ ] | [ ] | [ ] | Planned |
| Digital signature | P1 | [ ] | [ ] | [ ] | Planned |
| Offline SWMS creation | P0 | [ ] | [ ] | N/A | Planned |
| Sync offline SWMS | P0 | [ ] | [ ] | [ ] | Planned |

### Risk Assessment

| Test Case | Priority | iOS | Android | API | Status |
|-----------|----------|-----|---------|-----|--------|
| Create risk assessment | P1 | [ ] | [ ] | [ ] | Planned |
| Add hazards | P1 | [ ] | [ ] | [ ] | Planned |
| Set risk levels | P1 | [ ] | [ ] | [ ] | Planned |
| Add controls | P1 | [ ] | [ ] | [ ] | Planned |
| Export to PDF | P1 | [ ] | [ ] | [ ] | Planned |

### Certification Tracker

| Test Case | Priority | iOS | Android | API | Status |
|-----------|----------|-----|---------|-----|--------|
| Add certification | P1 | [ ] | [ ] | [ ] | Planned |
| View certifications | P1 | [ ] | [ ] | [ ] | Planned |
| Expiry notifications | P2 | [ ] | [ ] | [ ] | Planned |
| Upload cert document | P2 | [ ] | [ ] | [ ] | Planned |

---

## Authentication - Test Matrix

| Test Case | Priority | iOS | Android | API | Status |
|-----------|----------|-----|---------|-----|--------|
| Register with email | P0 | [ ] | [ ] | [ ] | Planned |
| Login with password | P0 | [ ] | [ ] | [ ] | Planned |
| Magic link login | P1 | [ ] | [ ] | [ ] | Planned |
| Password reset | P1 | [ ] | [ ] | [ ] | Planned |
| JWT refresh | P0 | [ ] | [ ] | [ ] | Planned |
| Logout | P0 | [ ] | [ ] | [ ] | Planned |
| Session persistence | P0 | [ ] | [ ] | N/A | Planned |

---

## Offline Functionality - Test Matrix

| Test Case | Priority | iOS | Android | Status |
|-----------|----------|-----|---------|--------|
| App loads offline | P0 | [ ] | [ ] | Planned |
| View cached documents | P0 | [ ] | [ ] | Planned |
| Create SWMS offline | P0 | [ ] | [ ] | Planned |
| Edit SWMS offline | P0 | [ ] | [ ] | Planned |
| Sync on reconnect | P0 | [ ] | [ ] | Planned |
| Conflict resolution | P1 | [ ] | [ ] | Planned |
| Offline indicator UI | P1 | [ ] | [ ] | Planned |

---

## API Endpoint Coverage

### Health & Status

| Endpoint | Method | Test | Status |
|----------|--------|------|--------|
| `/health` | GET | [ ] | Planned |

### Authentication

| Endpoint | Method | Test | Status |
|----------|--------|------|--------|
| `/auth/register` | POST | [ ] | Planned |
| `/auth/login` | POST | [ ] | Planned |
| `/auth/refresh` | POST | [ ] | Planned |
| `/auth/logout` | POST | [ ] | Planned |
| `/auth/magic-link` | POST | [ ] | Planned |

### Compliance

| Endpoint | Method | Test | Status |
|----------|--------|------|--------|
| `/compliance/templates` | GET | [ ] | Planned |
| `/compliance/templates/:trade` | GET | [ ] | Planned |
| `/compliance/swms` | POST | [ ] | Planned |
| `/compliance/swms` | GET | [ ] | Planned |
| `/compliance/swms/:id` | GET | [ ] | Planned |
| `/compliance/swms/:id` | PUT | [ ] | Planned |
| `/compliance/swms/:id` | DELETE | [ ] | Planned |
| `/compliance/swms/:id/pdf` | POST | [ ] | Planned |
| `/compliance/ai/hazards` | POST | [ ] | Planned |
| `/compliance/ai/controls` | POST | [ ] | Planned |

### Documents

| Endpoint | Method | Test | Status |
|----------|--------|------|--------|
| `/documents` | GET | [ ] | Planned |
| `/documents` | POST | [ ] | Planned |
| `/documents/:id` | GET | [ ] | Planned |
| `/documents/:id` | DELETE | [ ] | Planned |

---

## Test Data Requirements

### Users
- `test-electrician@example.com` - Electrician user
- `test-plumber@example.com` - Plumber user
- `test-builder@example.com` - Builder user

### SWMS Templates
- Electrician template (complete)
- Plumber template (complete)
- Builder template (complete)

### Sites
- `123 Test Street, Auckland` - Urban site
- `Rural Road, Waikato` - Rural site (poor connectivity test)

---

## Test Environment

| Environment | URL | Purpose |
|-------------|-----|---------|
| Local | localhost:29000 | Development |
| CI/CD | docker-based | Automated tests |
| Staging | staging-api.trademate.nz | Integration tests |

---

## Coverage Summary

| Module | Target | Current | Status |
|--------|--------|---------|--------|
| Authentication | 100% | 0% | Not Started |
| Compliance SWMS | 100% | 0% | Not Started |
| Risk Assessment | 80% | 0% | Not Started |
| Certifications | 80% | 0% | Not Started |
| Offline | 100% | 0% | Not Started |
| API Endpoints | 80% | 0% | Not Started |

---

## Action Items

1. [ ] Set up Detox for mobile E2E testing
2. [ ] Set up Jest + Supertest for API testing
3. [ ] Create test data fixtures
4. [ ] Implement authentication tests first (P0)
5. [ ] Implement SWMS generation tests (P0)
6. [ ] Implement offline tests (P0)

---

## Test File Inventory

| File | Coverage | Last Run |
|------|----------|----------|
| `tests/api/auth.test.ts` | N/A | N/A |
| `tests/api/compliance.test.ts` | N/A | N/A |
| `tests/e2e/swms.test.ts` | N/A | N/A |
| `tests/e2e/offline.test.ts` | N/A | N/A |

---

**Next Review**: After Module 1 MVP complete
