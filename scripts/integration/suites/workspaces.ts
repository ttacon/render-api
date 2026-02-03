import type { TestSuite } from '../runner.js';

export const workspacesSuite: TestSuite = {
  name: 'workspaces',
  description: 'Workspaces (read-only, list)',

  async run(ctx) {
    // LIST
    ctx.log('Listing workspaces...');
    const { items } = await ctx.client.workspaces.list();
    ctx.assert(items.length > 0, 'At least one workspace exists');
    ctx.log(`  Found ${items.length} workspaces`, 'debug');

    // Verify owner ID exists in workspaces
    ctx.assertContains(
      items,
      (w) => w.id === ctx.ownerId,
      'Configured owner ID exists in workspaces',
    );

    // RETRIEVE (using the configured owner)
    ctx.log('Retrieving workspace...');
    const workspace = await ctx.client.workspaces.retrieve(ctx.ownerId);
    ctx.assertEqual(workspace.id, ctx.ownerId, 'Retrieved workspace ID matches');
    ctx.log(`  Workspace: ${workspace.name} (${workspace.type})`, 'debug');

    ctx.log('All workspace operations passed');
  },
};
