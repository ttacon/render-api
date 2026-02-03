import type { TestSuite } from '../runner.js';

export const postgresSuite: TestSuite = {
  name: 'postgres',
  description: 'PostgreSQL databases (create/delete)',
  expensive: true,

  async run(ctx) {
    const dbName = ctx.uniqueName('postgres');
    let postgresId: string | undefined;

    try {
      // CREATE
      ctx.log(`Creating PostgreSQL database "${dbName}"...`);
      ctx.log('  (This may take a minute to provision)', 'info');
      const postgres = await ctx.client.postgres.create({
        name: dbName,
        ownerId: ctx.ownerId,
        plan: 'free',
        region: 'oregon',
        version: '16',
        databaseName: 'testdb',
        databaseUser: 'testuser',
      });
      postgresId = postgres.id;
      ctx.assertDefined(postgres.id, 'Postgres has ID');
      ctx.assertEqual(postgres.name, dbName, 'Postgres name matches');
      ctx.log(`  Created postgres: ${postgres.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving postgres...');
      const retrieved = await ctx.client.postgres.retrieve(postgresId);
      ctx.assertEqual(retrieved.id, postgresId, 'Retrieved postgres ID matches');
      ctx.assertEqual(retrieved.name, dbName, 'Retrieved postgres name matches');

      // LIST
      ctx.log('Listing postgres databases...');
      const { items } = await ctx.client.postgres.list({ ownerId: ctx.ownerId });
      ctx.assertContains(items, (p) => p.id === postgresId, 'Postgres appears in list');
      ctx.log(`  Found ${items.length} postgres databases`, 'debug');

      // UPDATE
      const updatedName = `${dbName}-updated`;
      ctx.log(`Updating postgres name to "${updatedName}"...`);
      const updated = await ctx.client.postgres.update(postgresId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Postgres name updated');

      // CONNECTION INFO (may not be available immediately)
      ctx.log('Retrieving connection info...');
      try {
        const connectionInfo = await ctx.client.postgres.connectionInfo(postgresId);
        ctx.assertDefined(
          connectionInfo.internalConnectionString,
          'Internal connection string exists',
        );
        ctx.log('  Connection info retrieved successfully', 'debug');
      } catch (error) {
        // Connection info may not be ready immediately
        ctx.log(
          '  Connection info not yet available (database may still be provisioning)',
          'debug',
        );
      }

      // DELETE
      ctx.log('Deleting postgres...');
      await ctx.client.postgres.delete(postgresId);
      postgresId = undefined; // Mark as cleaned up

      ctx.log('All postgres operations passed');
    } finally {
      // Cleanup on failure
      if (postgresId) {
        ctx.log('Cleaning up postgres...', 'debug');
        await ctx.client.postgres.delete(postgresId).catch(() => {});
      }
    }
  },
};
