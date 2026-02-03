import type { TestSuite } from '../runner.js';

export const servicesSuite: TestSuite = {
  name: 'services',
  description: 'Services CRUD + nested resources',

  async run(ctx) {
    const serviceName = ctx.uniqueName('service');
    let serviceId: string | undefined;

    try {
      // CREATE - Using a Docker image
      ctx.log(`Creating service "${serviceName}"...`);
      const { service, deployId } = await ctx.client.services.create({
        type: 'web_service',
        name: serviceName,
        ownerId: ctx.ownerId,
        image: {
          ownerId: ctx.ownerId,
          imagePath: 'nginx:alpine',
        },
        serviceDetails: {
          runtime: 'image',
          plan: 'starter',
          region: 'oregon',
          envSpecificDetails: {
            dockerCommand: '',
          },
        },
      });
      serviceId = service.id;
      ctx.assert(!!service.id, 'Service has ID');
      ctx.assertEqual(service.name, serviceName, 'Service name matches');
      ctx.log(
        `  Created service: ${service.id}${deployId ? `, deploy: ${deployId}` : ''}`,
        'debug',
      );

      // RETRIEVE
      ctx.log('Retrieving service...');
      const retrieved = await ctx.client.services.retrieve(serviceId);
      ctx.assertEqual(retrieved.id, serviceId, 'Retrieved service ID matches');
      ctx.assertEqual(retrieved.name, serviceName, 'Retrieved service name matches');

      // LIST
      ctx.log('Listing services...');
      const { items } = await ctx.client.services.list({ ownerId: ctx.ownerId });
      ctx.assertContains(items, (s) => s.id === serviceId, 'Service appears in list');
      ctx.log(`  Found ${items.length} services`, 'debug');

      // UPDATE
      const updatedName = `${serviceName}-updated`;
      ctx.log(`Updating service name to "${updatedName}"...`);
      const updated = await ctx.client.services.update(serviceId, {
        name: updatedName,
      });
      ctx.assertEqual(updated.name, updatedName, 'Service name updated');

      // TEST NESTED RESOURCES

      // DEPLOYS - List
      ctx.log('Listing deploys...');
      const { items: deploys } = await ctx.client.services.deploys.list(serviceId);
      ctx.assert(deploys.length > 0, 'Service has at least one deploy');
      ctx.log(`  Found ${deploys.length} deploys`, 'debug');

      // DEPLOYS - Retrieve (use the first deploy from the list)
      const firstDeploy = deploys[0];
      ctx.log('Retrieving deploy...');
      const deploy = await ctx.client.services.deploys.retrieve(serviceId, firstDeploy.id);
      ctx.assertEqual(deploy.id, firstDeploy.id, 'Deploy ID matches');

      // ENV VARS - Set (create/update)
      ctx.log('Creating env var...');
      const envVar = await ctx.client.services.envVars.set(serviceId, 'TEST_ENV_VAR', 'test-value');
      ctx.assertEqual(envVar.key, 'TEST_ENV_VAR', 'Env var key matches');
      ctx.assertEqual(envVar.value, 'test-value', 'Env var value matches');

      // ENV VARS - List
      ctx.log('Listing env vars...');
      const { items: envVars } = await ctx.client.services.envVars.list(serviceId);
      ctx.assertContains(
        envVars,
        (v) => v.key === 'TEST_ENV_VAR',
        'Created env var appears in list',
      );

      // ENV VARS - Update (using set again)
      ctx.log('Updating env var...');
      const updatedEnvVar = await ctx.client.services.envVars.set(
        serviceId,
        'TEST_ENV_VAR',
        'updated-value',
      );
      ctx.assertEqual(updatedEnvVar.value, 'updated-value', 'Env var value updated');

      // ENV VARS - Retrieve
      ctx.log('Retrieving env var...');
      const retrievedEnvVar = await ctx.client.services.envVars.retrieve(serviceId, 'TEST_ENV_VAR');
      ctx.assertEqual(retrievedEnvVar.value, 'updated-value', 'Retrieved env var value matches');

      // ENV VARS - Delete
      ctx.log('Deleting env var...');
      await ctx.client.services.envVars.delete(serviceId, 'TEST_ENV_VAR');

      // SECRET FILES - Set (create/update)
      ctx.log('Creating secret file...');
      const secretFile = await ctx.client.services.secretFiles.set(
        serviceId,
        'test-secret.json',
        '{"secret": "value"}',
      );
      ctx.assertEqual(secretFile.name, 'test-secret.json', 'Secret file name matches');

      // SECRET FILES - List
      ctx.log('Listing secret files...');
      const { items: secretFiles } = await ctx.client.services.secretFiles.list(serviceId);
      ctx.assertContains(
        secretFiles,
        (f) => f.name === 'test-secret.json',
        'Created secret file appears in list',
      );

      // SECRET FILES - Update
      ctx.log('Updating secret file...');
      const updatedSecretFile = await ctx.client.services.secretFiles.set(
        serviceId,
        'test-secret.json',
        '{"secret": "updated"}',
      );
      ctx.assertEqual(
        updatedSecretFile.name,
        'test-secret.json',
        'Secret file name matches after update',
      );

      // SECRET FILES - Delete
      ctx.log('Deleting secret file...');
      await ctx.client.services.secretFiles.delete(serviceId, 'test-secret.json');

      // SUSPEND SERVICE
      ctx.log('Suspending service...');
      await ctx.client.services.suspend(serviceId);

      // Verify suspended
      const suspendedService = await ctx.client.services.retrieve(serviceId);
      ctx.assertEqual(suspendedService.suspended, 'suspended', 'Service is suspended');

      // DELETE SERVICE
      ctx.log('Deleting service...');
      await ctx.client.services.delete(serviceId);
      serviceId = undefined; // Mark as cleaned up

      ctx.log('All service operations passed');
    } finally {
      // Cleanup on failure
      if (serviceId) {
        ctx.log('Cleaning up service...', 'debug');
        await ctx.client.services.delete(serviceId).catch(() => {});
      }
    }
  },
};
