import type { TestSuite } from '../runner.js';

export const projectsSuite: TestSuite = {
  name: 'projects',
  description: 'Projects CRUD operations',

  async run(ctx) {
    const projectName = ctx.uniqueName('project');
    let projectId: string | undefined;

    try {
      // CREATE
      ctx.log(`Creating project "${projectName}"...`);
      const project = await ctx.client.projects.create({
        name: projectName,
        ownerId: ctx.ownerId,
      });
      projectId = project.id;
      ctx.assertDefined(project.id, 'Project has ID');
      ctx.assertEqual(project.name, projectName, 'Project name matches');
      ctx.log(`  Created project: ${project.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving project...');
      const retrieved = await ctx.client.projects.retrieve(projectId);
      ctx.assertEqual(retrieved.id, projectId, 'Retrieved project ID matches');
      ctx.assertEqual(retrieved.name, projectName, 'Retrieved project name matches');

      // LIST
      ctx.log('Listing projects...');
      const { items } = await ctx.client.projects.list({ ownerId: ctx.ownerId });
      ctx.assertContains(items, (p) => p.id === projectId, 'Project appears in list');
      ctx.log(`  Found ${items.length} projects`, 'debug');

      // UPDATE
      const updatedName = `${projectName}-updated`;
      ctx.log(`Updating project name to "${updatedName}"...`);
      const updated = await ctx.client.projects.update(projectId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Project name updated');

      // DELETE
      ctx.log('Deleting project...');
      await ctx.client.projects.delete(projectId);
      projectId = undefined; // Mark as cleaned up

      // Verify deletion
      ctx.log('Verifying deletion...');
      try {
        await ctx.client.projects.retrieve(project.id);
        throw new Error('Project should have been deleted');
      } catch (error: unknown) {
        // Expected - project should not exist
        if (error instanceof Error && error.message.includes('should have been deleted')) {
          throw error;
        }
        ctx.log('  Project successfully deleted', 'debug');
      }

      ctx.log('All project operations passed');
    } finally {
      // Cleanup on failure
      if (projectId) {
        ctx.log('Cleaning up project...', 'debug');
        await ctx.client.projects.delete(projectId).catch(() => {});
      }
    }
  },
};
