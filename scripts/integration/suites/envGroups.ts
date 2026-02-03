import type { TestSuite } from '../runner.js';

export const envGroupsSuite: TestSuite = {
  name: 'envGroups',
  description: 'Environment Groups CRUD + env vars',

  async run(ctx) {
    const envGroupName = ctx.uniqueName('envgroup');
    let envGroupId: string | undefined;

    try {
      // CREATE
      ctx.log(`Creating env group "${envGroupName}"...`);
      const envGroup = await ctx.client.envGroups.create({
        name: envGroupName,
        ownerId: ctx.ownerId,
        envVars: [
          { key: 'TEST_VAR_1', value: 'value1' },
          { key: 'TEST_VAR_2', value: 'value2' },
        ],
        secretFiles: [{ name: 'test-secret.txt', content: 'secret-content' }],
      });
      envGroupId = envGroup.id;
      ctx.assertDefined(envGroup.id, 'Env group has ID');
      ctx.assertEqual(envGroup.name, envGroupName, 'Env group name matches');
      ctx.log(`  Created env group: ${envGroup.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving env group...');
      const retrieved = await ctx.client.envGroups.retrieve(envGroupId);
      ctx.assertEqual(retrieved.id, envGroupId, 'Retrieved env group ID matches');
      ctx.assertEqual(retrieved.name, envGroupName, 'Retrieved env group name matches');

      // Verify env vars were created
      ctx.assert(
        retrieved.envVars.some((v) => v.key === 'TEST_VAR_1'),
        'TEST_VAR_1 exists',
      );
      ctx.assert(
        retrieved.envVars.some((v) => v.key === 'TEST_VAR_2'),
        'TEST_VAR_2 exists',
      );

      // LIST
      ctx.log('Listing env groups...');
      const { items } = await ctx.client.envGroups.list({ ownerId: ctx.ownerId });
      ctx.assertContains(items, (g) => g.id === envGroupId, 'Env group appears in list');
      ctx.log(`  Found ${items.length} env groups`, 'debug');

      // UPDATE ENV VAR
      ctx.log('Updating env var...');
      const updatedVar = await ctx.client.envGroups.updateEnvVar(
        envGroupId,
        'TEST_VAR_1',
        'updated-value',
      );
      ctx.assertEqual(updatedVar.value, 'updated-value', 'Env var value updated');

      // RETRIEVE ENV VAR
      ctx.log('Retrieving env var...');
      const retrievedVar = await ctx.client.envGroups.retrieveEnvVar(envGroupId, 'TEST_VAR_1');
      ctx.assertEqual(retrievedVar.value, 'updated-value', 'Retrieved env var value matches');

      // DELETE ENV VAR
      ctx.log('Deleting env var...');
      await ctx.client.envGroups.deleteEnvVar(envGroupId, 'TEST_VAR_2');

      // Verify env var deletion
      const afterDelete = await ctx.client.envGroups.retrieve(envGroupId);
      ctx.assert(
        !afterDelete.envVars.some((v) => v.key === 'TEST_VAR_2'),
        'TEST_VAR_2 was deleted',
      );

      // UPDATE SECRET FILE
      ctx.log('Updating secret file...');
      const updatedSecret = await ctx.client.envGroups.updateSecretFile(
        envGroupId,
        'test-secret.txt',
        'updated-secret-content',
      );
      ctx.assertEqual(updatedSecret.name, 'test-secret.txt', 'Secret file name matches');

      // RETRIEVE SECRET FILE
      ctx.log('Retrieving secret file...');
      const retrievedSecret = await ctx.client.envGroups.retrieveSecretFile(
        envGroupId,
        'test-secret.txt',
      );
      ctx.assertEqual(
        retrievedSecret.name,
        'test-secret.txt',
        'Retrieved secret file name matches',
      );

      // UPDATE ENV GROUP
      const updatedName = `${envGroupName}-updated`;
      ctx.log(`Updating env group name to "${updatedName}"...`);
      const updated = await ctx.client.envGroups.update(envGroupId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Env group name updated');

      // DELETE
      ctx.log('Deleting env group...');
      await ctx.client.envGroups.delete(envGroupId);
      envGroupId = undefined; // Mark as cleaned up

      ctx.log('All env group operations passed');
    } finally {
      // Cleanup on failure
      if (envGroupId) {
        ctx.log('Cleaning up env group...', 'debug');
        await ctx.client.envGroups.delete(envGroupId).catch(() => {});
      }
    }
  },
};
