import type { TestSuite } from '../runner.js';

export const blueprintsSuite: TestSuite = {
  name: 'blueprints',
  description: 'Blueprints (read-only, list)',

  async run(ctx) {
    // LIST
    ctx.log('Listing blueprints...');
    const { items } = await ctx.client.blueprints.list({
      ownerId: ctx.ownerId,
      limit: 10,
    });
    // Blueprints may be empty if no IaC is set up, so we just verify the call succeeds
    ctx.log(`  Found ${items.length} blueprints`, 'debug');

    // If we have blueprints, test retrieve
    if (items.length > 0) {
      const blueprintId = items[0].id;
      ctx.log(`Retrieving blueprint ${blueprintId}...`);
      const blueprint = await ctx.client.blueprints.retrieve(blueprintId);
      ctx.assertEqual(blueprint.id, blueprintId, 'Blueprint ID matches');
      ctx.log(`  Blueprint: ${blueprint.name}`, 'debug');
    } else {
      ctx.log('  No blueprints to retrieve (this is okay)', 'debug');
    }

    ctx.log('All blueprint operations passed');
  },
};
