import { prisma } from '../db.js';

// ─── CRON: Auto-close expired cycles ───
// Checks every 60 seconds for OPEN cycles past their endDate
export function startCronJobs() {
    const INTERVAL_MS = 60 * 1000; // 60 seconds

    setInterval(async () => {
        try {
            const now = new Date();

            // Find all OPEN cycles whose deadline has passed
            const expiredCycles = await prisma.matchingCycle.findMany({
                where: {
                    status: 'OPEN',
                    endDate: { lte: now }
                }
            });

            for (const cycle of expiredCycles) {
                await prisma.matchingCycle.update({
                    where: { id: cycle.id },
                    data: { status: 'CLOSED' }
                });
                console.log(`⏰ Auto-closed cycle: "${cycle.name}" (deadline: ${cycle.endDate.toISOString()})`);
            }
        } catch (error) {
            console.error('Cron job error:', error);
        }
    }, INTERVAL_MS);

    console.log('⏰ Cron job started: checking for expired cycles every 60s');
}
