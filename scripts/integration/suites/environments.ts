import type { TestSuite } from '../runner.js';

export const environmentsSuite: TestSuite = {
  name: 'environments',
  description: 'Environments CRUD (requires project)',

  async run(ctx) {
    const projectName = ctx.uniqueName('env-project');
    const envName = ctx.uniqueName('environment');
    let projectId: string | undefined;
    let environmentId: string | undefined;

    try {
      // First create a project to hold the environment
      ctx.log(`Creating project "${projectName}" for environments...`);
      const project = await ctx.client.projects.create({
        name: projectName,
        ownerId: ctx.ownerId,
      });
      projectId = project.id;
      ctx.log(`  Created project: ${project.id}`, 'debug');

      // CREATE ENVIRONMENT
      ctx.log(`Creating environment "${envName}"...`);
      const environment = await ctx.client.environments.create({
        name: envName,
        projectId: projectId,
        protectedStatus: 'not_protected',
      });
      environmentId = environment.id;
      ctx.assertDefined(environment.id, 'Environment has ID');
      ctx.assertEqual(environment.name, envName, 'Environment name matches');
      ctx.log(`  Created environment: ${environment.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving environment...');
      const retrieved = await ctx.client.environments.retrieve(environmentId);
      ctx.assertEqual(retrieved.id, environmentId, 'Retrieved environment ID matches');
      ctx.assertEqual(retrieved.name, envName, 'Retrieved environment name matches');

      // LIST
      ctx.log('Listing environments...');
      const { items } = await ctx.client.environments.list({ projectId });
      ctx.assertContains(items, (e) => e.id === environmentId, 'Environment appears in list');
      ctx.log(`  Found ${items.length} environments`, 'debug');

      // UPDATE
      const updatedName = `${envName}-updated`;
      ctx.log(`Updating environment name to "${updatedName}"...`);
      const updated = await ctx.client.environments.update(environmentId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Environment name updated');

      // DELETE ENVIRONMENT
      ctx.log('Deleting environment...');
      await ctx.client.environments.delete(environmentId);
      environmentId = undefined; // Mark as cleaned up

      // DELETE PROJECT
      ctx.log('Deleting project...');
      await ctx.client.projects.delete(projectId);
      projectId = undefined;

      ctx.log('All environment operations passed');
    } finally {
      // Cleanup on failure
      if (environmentId) {
        ctx.log('Cleaning up environment...', 'debug');
        await ctx.client.environments.delete(environmentId).catch(() => {});
      }
      if (projectId) {
        ctx.log('Cleaning up project...', 'debug');
        await ctx.client.projects.delete(projectId).catch(() => {});
      }
    }
  },
};
