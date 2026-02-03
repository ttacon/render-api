import type { TestSuite } from '../runner.js';

export const keyValueSuite: TestSuite = {
  name: 'keyValue',
  description: 'Key-Value stores (create/delete)',
  expensive: true,

  async run(ctx) {
    const kvName = ctx.uniqueName('keyvalue');
    let keyValueId: string | undefined;

    try {
      // CREATE
      ctx.log(`Creating Key-Value store "${kvName}"...`);
      ctx.log('  (This may take a minute to provision)', 'info');
      const keyValue = await ctx.client.keyValue.create({
        name: kvName,
        ownerId: ctx.ownerId,
        plan: 'free',
        region: 'oregon',
        maxmemoryPolicy: 'noeviction',
      });
      keyValueId = keyValue.id;
      ctx.assertDefined(keyValue.id, 'Key-Value has ID');
      ctx.assertEqual(keyValue.name, kvName, 'Key-Value name matches');
      ctx.log(`  Created Key-Value: ${keyValue.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving Key-Value store...');
      const retrieved = await ctx.client.keyValue.retrieve(keyValueId);
      ctx.assertEqual(retrieved.id, keyValueId, 'Retrieved Key-Value ID matches');
      ctx.assertEqual(retrieved.name, kvName, 'Retrieved Key-Value name matches');

      // LIST
      ctx.log('Listing Key-Value stores...');
      const { items } = await ctx.client.keyValue.list({ ownerId: ctx.ownerId });
      ctx.assertContains(items, (kv) => kv.id === keyValueId, 'Key-Value appears in list');
      ctx.log(`  Found ${items.length} Key-Value stores`, 'debug');

      // UPDATE
      const updatedName = `${kvName}-updated`;
      ctx.log(`Updating Key-Value name to "${updatedName}"...`);
      const updated = await ctx.client.keyValue.update(keyValueId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Key-Value name updated');

      // CONNECTION INFO (may not be available immediately)
      ctx.log('Retrieving connection info...');
      try {
        const connectionInfo = await ctx.client.keyValue.connectionInfo(keyValueId);
        ctx.assertDefined(
          connectionInfo.internalConnectionString,
          'Internal connection string exists',
        );
        ctx.log('  Connection info retrieved successfully', 'debug');
      } catch (error) {
        // Connection info may not be ready immediately
        ctx.log('  Connection info not yet available (store may still be provisioning)', 'debug');
      }

      // DELETE
      ctx.log('Deleting Key-Value store...');
      await ctx.client.keyValue.delete(keyValueId);
      keyValueId = undefined; // Mark as cleaned up

      ctx.log('All Key-Value operations passed');
    } finally {
      // Cleanup on failure
      if (keyValueId) {
        ctx.log('Cleaning up Key-Value store...', 'debug');
        await ctx.client.keyValue.delete(keyValueId).catch(() => {});
      }
    }
  },
};
