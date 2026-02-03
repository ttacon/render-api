import type { TestSuite } from '../runner.js';

export const auditLogsSuite: TestSuite = {
  name: 'auditLogs',
  description: 'Audit Logs (read-only, list)',

  async run(ctx) {
    // LIST
    ctx.log('Listing audit logs...');
    const { items } = await ctx.client.auditLogs.listForOwner(ctx.ownerId, {
      limit: 10,
    });
    // Audit logs may be empty for new accounts, so we just verify the call succeeds
    ctx.log(`  Found ${items.length} audit log entries`, 'debug');

    // Test with date filters (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    ctx.log('Listing audit logs with date filter...');
    const { items: recentItems } = await ctx.client.auditLogs.listForOwner(ctx.ownerId, {
      startTime: oneWeekAgo.toISOString(),
      limit: 5,
    });
    ctx.log(`  Found ${recentItems.length} recent audit log entries`, 'debug');

    ctx.log('All audit log operations passed');
  },
};
