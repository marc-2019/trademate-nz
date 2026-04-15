/**
 * Unit tests for recurring-invoices service — computeNextGenerationDate
 *
 * The function must never return an invalid date string (e.g. "2026-04-31").
 * When dayOfMonth exceeds the days in the target month it should clamp to the
 * last valid day of that month.
 */

import { computeNextGenerationDate } from '../../services/recurring-invoices.js';

// Helper: build a Date for a specific calendar day (local time)
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('computeNextGenerationDate', () => {
  describe('same-month scheduling', () => {
    it('returns the target day in the current month when we have not yet reached it', () => {
      // "from" is April 10; target day is 15 → still in April
      const result = computeNextGenerationDate(15, d(2026, 4, 10));
      expect(result).toBe('2026-04-15');
    });

    it('rolls to next month when current day equals target day', () => {
      // "from" is April 15; target day is 15 → condition is >= so rolls to May
      const result = computeNextGenerationDate(15, d(2026, 4, 15));
      expect(result).toBe('2026-05-15');
    });

    it('rolls to next month when current day is past target day', () => {
      // "from" is April 20; target day is 15 → rolls to May
      const result = computeNextGenerationDate(15, d(2026, 4, 20));
      expect(result).toBe('2026-05-15');
    });
  });

  describe('year-end rollover', () => {
    it('rolls from December to January of the next year', () => {
      const result = computeNextGenerationDate(15, d(2026, 12, 20));
      expect(result).toBe('2027-01-15');
    });

    it('handles day-of-month = 1 in December correctly', () => {
      const result = computeNextGenerationDate(1, d(2026, 12, 1));
      expect(result).toBe('2027-01-01');
    });
  });

  describe('month-length clamping (the bug fix)', () => {
    it('clamps day 31 in April (30-day month) to April 30', () => {
      // "from" is April 10; target day 31 has not passed yet (10 < 31)
      const result = computeNextGenerationDate(31, d(2026, 4, 10));
      expect(result).toBe('2026-04-30');
    });

    it('clamps day 31 in June (30-day month) to June 30', () => {
      const result = computeNextGenerationDate(31, d(2026, 6, 5));
      expect(result).toBe('2026-06-30');
    });

    it('clamps day 30 in February (non-leap year) to Feb 28', () => {
      // 2026 is not a leap year
      const result = computeNextGenerationDate(30, d(2026, 2, 1));
      expect(result).toBe('2026-02-28');
    });

    it('clamps day 29 in February (non-leap year) to Feb 28', () => {
      const result = computeNextGenerationDate(29, d(2026, 2, 1));
      expect(result).toBe('2026-02-28');
    });

    it('allows day 29 in February on a leap year', () => {
      // 2024 is a leap year
      const result = computeNextGenerationDate(29, d(2024, 2, 1));
      expect(result).toBe('2024-02-29');
    });

    it('clamps day 31 when rolling from January into February (non-leap year)', () => {
      // "from" is Jan 31; target day 31 → condition 31 >= 31 so rolls to February
      const result = computeNextGenerationDate(31, d(2026, 1, 31));
      expect(result).toBe('2026-02-28');
    });

    it('clamps day 31 when rolling from January into February (leap year)', () => {
      const result = computeNextGenerationDate(31, d(2024, 1, 31));
      expect(result).toBe('2024-02-29');
    });

    it('does not clamp day 31 in a 31-day month', () => {
      const result = computeNextGenerationDate(31, d(2026, 3, 1));
      expect(result).toBe('2026-03-31');
    });

    it('does not clamp day 28 in February (always safe)', () => {
      const result = computeNextGenerationDate(28, d(2026, 2, 1));
      expect(result).toBe('2026-02-28');
    });
  });

  describe('edge cases', () => {
    it('handles day 1 in any month', () => {
      const result = computeNextGenerationDate(1, d(2026, 6, 2));
      expect(result).toBe('2026-07-01');
    });

    it('returns a valid ISO date string (YYYY-MM-DD format)', () => {
      const result = computeNextGenerationDate(15, d(2026, 4, 10));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('never produces an invalid date for any day 1–31 across all months', () => {
      for (let targetDay = 1; targetDay <= 31; targetDay++) {
        for (let month = 1; month <= 12; month++) {
          const from = d(2026, month, 1);
          const result = computeNextGenerationDate(targetDay, from);
          const parsed = new Date(result);
          expect(isNaN(parsed.getTime())).toBe(false);
          // Verify round-trip: the date string must represent a real calendar date
          const [y, m, day] = result.split('-').map(Number);
          const check = new Date(y, m - 1, day);
          expect(check.getFullYear()).toBe(y);
          expect(check.getMonth() + 1).toBe(m);
          expect(check.getDate()).toBe(day);
        }
      }
    });
  });
});
