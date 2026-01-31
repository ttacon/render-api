import { describe, expect, it } from 'bun:test';
import { RenderClient } from './client.js';

describe('RenderClient', () => {
  it('should create client with API key', () => {
    const client = new RenderClient({ apiKey: 'rnd_test_key' });
    expect(client).toBeInstanceOf(RenderClient);
  });

  it('should expose all resource clients', () => {
    const client = new RenderClient({ apiKey: 'rnd_test_key' });

    // Core resources
    expect(client.services).toBeDefined();
    expect(client.postgres).toBeDefined();
    expect(client.keyValue).toBeDefined();
    expect(client.redis).toBeDefined();
    expect(client.disks).toBeDefined();
    expect(client.envGroups).toBeDefined();

    // Projects & Environments
    expect(client.projects).toBeDefined();
    expect(client.environments).toBeDefined();

    // Infrastructure
    expect(client.blueprints).toBeDefined();
    expect(client.registryCredentials).toBeDefined();
    expect(client.webhooks).toBeDefined();

    // User & Workspace
    expect(client.workspaces).toBeDefined();
    expect(client.users).toBeDefined();

    // Monitoring
    expect(client.logs).toBeDefined();
    expect(client.metrics).toBeDefined();
    expect(client.maintenance).toBeDefined();

    // Other
    expect(client.notificationSettings).toBeDefined();
    expect(client.auditLogs).toBeDefined();
    expect(client.events).toBeDefined();
    expect(client.cronJobs).toBeDefined();
  });

  it('should expose nested resources on services', () => {
    const client = new RenderClient({ apiKey: 'rnd_test_key' });

    expect(client.services.deploys).toBeDefined();
    expect(client.services.customDomains).toBeDefined();
    expect(client.services.envVars).toBeDefined();
    expect(client.services.secretFiles).toBeDefined();
    expect(client.services.headers).toBeDefined();
    expect(client.services.routes).toBeDefined();
    expect(client.services.jobs).toBeDefined();
  });

  it('should accept optional configuration', () => {
    const client = new RenderClient({
      apiKey: 'rnd_test_key',
      baseUrl: 'https://custom.api.render.com/v1',
      timeout: 60000,
      maxRetries: 5,
    });
    expect(client).toBeInstanceOf(RenderClient);
  });
});
