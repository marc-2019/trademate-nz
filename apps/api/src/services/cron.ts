/**
 * Cron Service
 * Scheduled tasks for BossBoard
 *
 * Runs:
 * - Daily cert expiry check at 8:00 AM NZST (20:00 UTC previous day)
 */

import cron, { type ScheduledTask } from 'node-cron';
import notificationsService from './notifications.js';

let certExpiryJob: ScheduledTask | null = null;

/**
 * Start all cron jobs
 */
function start(): void {
  console.log('[Cron] Starting scheduled tasks...');

  // Run daily at 8:00 AM NZST (UTC+12 in winter, UTC+13 in summer)
  // We use 20:00 UTC which is ~8-9 AM NZ time depending on DST
  certExpiryJob = cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Running cert expiry check...');
    try {
      const result = await notificationsService.checkAndNotifyExpiringCerts();
      console.log(`[Cron] Cert expiry check complete: ${result.notified} notifications sent`);
    } catch (error) {
      console.error('[Cron] Cert expiry check failed:', error);
    }
  }, {
    timezone: 'Pacific/Auckland',
  });

  console.log('[Cron] Cert expiry check scheduled (daily at 8:00 AM NZST)');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stop(): void {
  if (certExpiryJob) {
    certExpiryJob.stop();
    certExpiryJob = null;
    console.log('[Cron] All scheduled tasks stopped');
  }
}

/**
 * Run cert expiry check manually (for testing / admin trigger)
 */
async function runCertExpiryCheckNow(): Promise<{ checked: number; notified: number }> {
  console.log('[Cron] Manual cert expiry check triggered...');
  const result = await notificationsService.checkAndNotifyExpiringCerts();
  console.log(`[Cron] Manual check complete: ${result.notified} notifications sent`);
  return result;
}

export default {
  start,
  stop,
  runCertExpiryCheckNow,
};
