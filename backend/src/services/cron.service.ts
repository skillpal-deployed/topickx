import cron from 'node-cron';
import { runExpiryCheck } from './package.service';
import { AdminRole } from '../types';

/**
 * Initialize all system cron jobs
 */
export const initCronJobs = () => {
    // Run expiry check every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        try {
            await runExpiryCheck('SYSTEM_CRON', AdminRole.SUPER_ADMIN);
        } catch (error) {
            console.error('[CRON] Expiry check failed:', error instanceof Error ? error.message : error);
        }
    });
};
