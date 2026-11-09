#!/usr/bin/env bun

/**
 * Read-only smoke test for the Render API client.
 *
 * Exercises every read/list endpoint in the client against the live Render API
 * so schema mismatches (RenderValidationError, i.e. the "type errors" we keep
 * hitting in production) are caught before release.
 *
 * Unlike `integration-test.ts`, this script:
 *   - performs NO writes, creates, updates, or deletes (completely read-only)
 *   - only requires RENDER_API_KEY (the owner ID is discovered automatically)
 *   - runs every check even when earlier ones fail, and reports ALL failures
 *   - classifies failures so schema/type mismatches stand out from API errors
 *
 * Usage:
 *   RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts [options]
 *
 * Options:
 *   --only <checks>    Only run specified checks (comma-separated)
 *   --skip <checks>    Skip specified checks (comma-separated)
 *   --service <id>     Target a specific service ID (default: first service)
 *   --timeout <ms>     Request timeout in ms (default: 30000)
 *   --delay <ms>       Delay between API calls in ms (default: 250)
 *   --list             List all available checks
 *   --verbose, -v      Show full error details
 *   --help, -h         Show this help message
 */

import {
  RenderApiError,
  RenderClient,
  RenderNotFoundError,
  RenderValidationError,
  type Service,
} from '../src/index.js';

// ============================================================================
// CLI options
// ============================================================================

interface CliOptions {
  only?: string[];
  skip?: string[];
  list?: boolean;
  verbose: boolean;
  timeout: number;
  delay: number;
  serviceId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    verbose: false,
    timeout: 30000,
    delay: 250,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        console.log(HELP_TEXT);
        process.exit(0);
        break;
      case '--list':
        options.list = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--only':
        if (argv[i + 1]) {
          options.only = argv[++i].split(',').map((s) => s.trim());
        }
        break;
      case '--skip':
        if (argv[i + 1]) {
          options.skip = argv[++i].split(',').map((s) => s.trim());
        }
        break;
      case '--service':
        if (argv[i + 1]) {
          options.serviceId = argv[++i];
        }
        break;
      case '--timeout':
        if (argv[i + 1]) {
          options.timeout = Number.parseInt(argv[++i], 10);
        }
        break;
      case '--delay':
        if (argv[i + 1]) {
          options.delay = Number.parseInt(argv[++i], 10);
        }
        break;
    }
  }

  return options;
}

const HELP_TEXT = `
Render API Read-Only Smoke Test

Runs every read/list operation in the client against the live Render API to
catch response schema mismatches (type errors) before they hit production.

Usage:
  RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts [options]

Required Environment Variables:
  RENDER_API_KEY      Your Render API key
  RENDER_OWNER_ID     Optional override; otherwise the first workspace is used

Options:
  --only <checks>     Only run specified checks (comma-separated)
  --skip <checks>     Skip specified checks (comma-separated)
  --service <id>      Target a specific service ID (default: first service)
  --timeout <ms>      Request timeout in ms (default: 30000)
  --delay <ms>        Delay between API calls in ms (default: 250)
  --list              List all available checks
  --verbose, -v       Show full error details
  --help, -h          Show this help message

Examples:
  # Run everything
  RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts

  # Only exercise service-related reads
  RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts --only services,service-deploys

  # Target a specific service for nested reads
  RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts --service srv-xxxx
`;

// ============================================================================
// Result tracking
// ============================================================================

type StepStatus = 'pass' | 'fail' | 'skip';
type FailureKind = 'schema' | 'api' | 'other';

interface StepResult {
  check: string;
  step: string;
  status: StepStatus;
  note?: string;
  failureKind?: FailureKind;
  httpStatus?: number;
  error?: Error;
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyFailure(error: unknown): { kind: FailureKind; httpStatus?: number } {
  if (error instanceof RenderValidationError) {
    return { kind: 'schema' };
  }
  if (error instanceof RenderApiError) {
    return { kind: 'api', httpStatus: error.status };
  }
  return { kind: 'other' };
}

function truncate(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Runs steps for a check, recording every outcome and continuing on failure.
 */
class SmokeRun {
  public readonly results: StepResult[] = [];

  constructor(
    public readonly client: RenderClient,
    public readonly options: CliOptions,
  ) {}

  /**
   * Run a single step. Returns undefined (and records the failure) instead of
   * throwing, so one broken endpoint doesn't hide problems on the rest.
   */
  async step<T>(check: string, name: string, fn: () => Promise<T>): Promise<T | undefined> {
    if (this.options.delay > 0) {
      await sleep(this.options.delay);
    }

    try {
      const result = await fn();
      this.results.push({ check, step: name, status: 'pass' });
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const { kind, httpStatus } = classifyFailure(error);

      this.results.push({
        check,
        step: name,
        status: 'fail',
        failureKind: kind,
        httpStatus,
        error: err,
      });

      const statusTag = httpStatus !== undefined ? ` [HTTP ${httpStatus}]` : '';
      if (kind === 'schema') {
        console.log(`  ${colors.red}✗ ${name}${statusTag}${colors.reset}`);
        console.log(`    ${colors.red}${truncate(err.message)}${colors.reset}`);
        const issues = JSON.stringify((error as RenderValidationError).errors, null, 2);
        console.log(
          `    ${colors.dim}${truncate(issues, this.options.verbose ? 4000 : 400)}${colors.reset}`,
        );
      } else {
        console.log(`  ${colors.red}✗ ${name}${statusTag}${colors.reset}`);
        console.log(`    ${colors.dim}${truncate(err.message)}${colors.reset}`);
        if (this.options.verbose && err.stack) {
          console.log(`    ${colors.dim}${err.stack}${colors.reset}`);
        }
      }

      return undefined;
    }
  }

  /**
   * Record a skipped step (e.g. nothing to retrieve because a list was empty).
   */
  skip(check: string, name: string, reason: string): void {
    this.results.push({ check, step: name, status: 'skip', note: reason });
    console.log(`  ${colors.dim}• ${name} — skipped (${reason})${colors.reset}`);
  }
}

// ============================================================================
// Shared state discovered during the run (checks run in dependency order)
// ============================================================================

interface CheckEnv {
  ownerId?: string;
  service?: Service;
  postgresId?: string;
}

/**
 * A named group of read-only steps.
 */
interface Check {
  name: string;
  description: string;
  run: (t: SmokeRun, env: CheckEnv) => Promise<void>;
}

// ============================================================================
// Checks
// ============================================================================

const usersCheck: Check = {
  name: 'users',
  description: 'Current user (read-only)',

  async run(t) {
    await t.step('users', 'retrieve current user', () => t.client.users.me());
  },
};

const workspacesCheck: Check = {
  name: 'workspaces',
  description: 'Workspaces + members (read-only)',

  async run(t, env) {
    const listResult = await t.step('workspaces', 'list workspaces', () =>
      t.client.workspaces.list(),
    );
    const workspaces = listResult?.items ?? [];

    const workspace =
      process.env.RENDER_OWNER_ID !== undefined && process.env.RENDER_OWNER_ID !== ''
        ? { id: process.env.RENDER_OWNER_ID }
        : workspaces[0];

    if (!workspace) {
      t.skip('workspaces', 'retrieve workspace', 'no workspaces found');
      t.skip('workspaces', 'list workspace members', 'no workspaces found');
      return;
    }

    env.ownerId = workspace.id;

    await t.step('workspaces', 'retrieve workspace', () =>
      t.client.workspaces.retrieve(workspace.id),
    );
    await t.step('workspaces', 'list workspace members', () =>
      t.client.workspaces.listMembers(workspace.id),
    );
  },
};

const servicesCheck: Check = {
  name: 'services',
  description: 'Services + instances (read-only)',

  async run(t, env) {
    const listResult = await t.step('services', 'list services', () => t.client.services.list());
    const services = listResult?.items ?? [];

    let service: Service | undefined;

    if (t.options.serviceId) {
      const retrieved = await t.step('services', `retrieve service ${t.options.serviceId}`, () =>
        t.client.services.retrieve(t.options.serviceId as string),
      );
      service = retrieved;
    } else {
      service = services[0];
    }

    if (!service) {
      t.skip('services', 'retrieve service', 'no services found');
      t.skip('services', 'list service instances', 'no services found');
      return;
    }

    env.service = service;

    if (!t.options.serviceId) {
      await t.step('services', `retrieve service ${service.id}`, () =>
        t.client.services.retrieve(service.id),
      );
    }
    await t.step('services', 'list service instances', () =>
      t.client.services.listInstances(service.id),
    );
  },
};

function serviceNestedCheck(
  name: string,
  description: string,
  steps: (t: SmokeRun, serviceId: string) => Promise<void>,
): Check {
  return {
    name,
    description,

    async run(t, env) {
      if (!env.service) {
        t.skip(name, `${name} reads`, 'no service available (services check skipped or empty)');
        return;
      }
      await steps(t, env.service.id);
    },
  };
}

const serviceDeploysCheck = serviceNestedCheck(
  'service-deploys',
  'Service deploys (read-only)',
  async (t, serviceId) => {
    const listResult = await t.step('service-deploys', 'list deploys', () =>
      t.client.services.deploys.list(serviceId),
    );
    const deploys = listResult?.items ?? [];
    const firstDeploy = deploys[0];

    if (!firstDeploy) {
      t.skip('service-deploys', 'retrieve deploy', 'no deploys found');
      return;
    }

    await t.step('service-deploys', `retrieve deploy ${firstDeploy.id}`, () =>
      t.client.services.deploys.retrieve(serviceId, firstDeploy.id),
    );
  },
);

const serviceCustomDomainsCheck = serviceNestedCheck(
  'service-custom-domains',
  'Service custom domains (read-only)',
  async (t, serviceId) => {
    const listResult = await t.step('service-custom-domains', 'list custom domains', () =>
      t.client.services.customDomains.list(serviceId),
    );
    const domains = listResult?.items ?? [];
    const firstDomain = domains[0];

    if (!firstDomain) {
      t.skip('service-custom-domains', 'retrieve custom domain', 'no custom domains found');
      return;
    }

    await t.step('service-custom-domains', `retrieve custom domain ${firstDomain.id}`, () =>
      t.client.services.customDomains.retrieve(serviceId, firstDomain.id),
    );
  },
);

const serviceEnvVarsCheck = serviceNestedCheck(
  'service-env-vars',
  'Service env vars (read-only)',
  async (t, serviceId) => {
    const listResult = await t.step('service-env-vars', 'list env vars', () =>
      t.client.services.envVars.list(serviceId),
    );
    const envVars = listResult?.items ?? [];
    const firstEnvVar = envVars[0];

    if (!firstEnvVar) {
      t.skip('service-env-vars', 'retrieve env var', 'no env vars found');
      return;
    }

    await t.step('service-env-vars', `retrieve env var ${firstEnvVar.key}`, () =>
      t.client.services.envVars.retrieve(serviceId, firstEnvVar.key),
    );
  },
);

const serviceSecretFilesCheck = serviceNestedCheck(
  'service-secret-files',
  'Service secret files (read-only)',
  async (t, serviceId) => {
    const listResult = await t.step('service-secret-files', 'list secret files', () =>
      t.client.services.secretFiles.list(serviceId),
    );
    const secretFiles = listResult?.items ?? [];
    const firstSecretFile = secretFiles[0];

    if (!firstSecretFile) {
      t.skip('service-secret-files', 'retrieve secret file', 'no secret files found');
      return;
    }

    await t.step('service-secret-files', `retrieve secret file ${firstSecretFile.name}`, () =>
      t.client.services.secretFiles.retrieve(serviceId, firstSecretFile.name),
    );
  },
);

const serviceHeadersCheck = serviceNestedCheck(
  'service-headers',
  'Service headers (read-only)',
  async (t, serviceId) => {
    await t.step('service-headers', 'list headers', () =>
      t.client.services.headers.list(serviceId),
    );
  },
);

const serviceRoutesCheck = serviceNestedCheck(
  'service-routes',
  'Service routes (read-only)',
  async (t, serviceId) => {
    await t.step('service-routes', 'list routes', () => t.client.services.routes.list(serviceId));
  },
);

const serviceJobsCheck = serviceNestedCheck(
  'service-jobs',
  'Service jobs (read-only)',
  async (t, serviceId) => {
    const listResult = await t.step('service-jobs', 'list jobs', () =>
      t.client.services.jobs.list(serviceId),
    );
    const jobs = listResult?.items ?? [];
    const firstJob = jobs[0];

    if (!firstJob) {
      t.skip('service-jobs', 'retrieve job', 'no jobs found');
      return;
    }

    await t.step('service-jobs', `retrieve job ${firstJob.id}`, () =>
      t.client.services.jobs.retrieve(serviceId, firstJob.id),
    );
  },
);

const postgresCheck: Check = {
  name: 'postgres',
  description: 'Postgres databases, users, exports (read-only)',

  async run(t, env) {
    const listResult = await t.step('postgres', 'list postgres databases', () =>
      t.client.postgres.list(),
    );
    const databases = listResult?.items ?? [];
    const firstDatabase = databases[0];

    if (!firstDatabase) {
      t.skip('postgres', 'retrieve postgres database', 'no databases found');
      t.skip('postgres', 'retrieve connection info', 'no databases found');
      t.skip('postgres', 'list database users', 'no databases found');
      t.skip('postgres', 'list database exports', 'no databases found');
      return;
    }

    env.postgresId = firstDatabase.id;

    await t.step('postgres', `retrieve postgres database ${firstDatabase.id}`, () =>
      t.client.postgres.retrieve(firstDatabase.id),
    );
    await t.step('postgres', 'retrieve connection info', () =>
      t.client.postgres.connectionInfo(firstDatabase.id),
    );
    await t.step('postgres', 'list database users', () =>
      t.client.postgres.listUsers(firstDatabase.id),
    );
    await t.step('postgres', 'list database exports', () =>
      t.client.postgres.listExports(firstDatabase.id),
    );
  },
};

const keyValueCheck: Check = {
  name: 'keyValue',
  description: 'Key Value instances (read-only)',

  async run(t) {
    const listResult = await t.step('keyValue', 'list key value instances', () =>
      t.client.keyValue.list(),
    );
    const instances = listResult?.items ?? [];
    const firstInstance = instances[0];

    if (!firstInstance) {
      t.skip('keyValue', 'retrieve key value instance', 'no instances found');
      t.skip('keyValue', 'retrieve connection info', 'no instances found');
      return;
    }

    await t.step('keyValue', `retrieve key value instance ${firstInstance.id}`, () =>
      t.client.keyValue.retrieve(firstInstance.id),
    );
    await t.step('keyValue', 'retrieve connection info', () =>
      t.client.keyValue.connectionInfo(firstInstance.id),
    );
  },
};

const redisCheck: Check = {
  name: 'redis',
  description: 'Redis instances (read-only, deprecated API)',

  async run(t) {
    const listResult = await t.step('redis', 'list redis instances', () => t.client.redis.list());
    const instances = listResult?.items ?? [];
    const firstInstance = instances[0];

    if (!firstInstance) {
      t.skip('redis', 'retrieve redis instance', 'no instances found');
      return;
    }

    await t.step('redis', `retrieve redis instance ${firstInstance.id}`, () =>
      t.client.redis.retrieve(firstInstance.id),
    );
  },
};

const disksCheck: Check = {
  name: 'disks',
  description: 'Disks + snapshots (read-only)',

  async run(t) {
    const listResult = await t.step('disks', 'list disks', () => t.client.disks.list());
    const disks = listResult?.items ?? [];
    const firstDisk = disks[0];

    if (!firstDisk) {
      t.skip('disks', 'retrieve disk', 'no disks found');
      t.skip('disks', 'list disk snapshots', 'no disks found');
      return;
    }

    await t.step('disks', `retrieve disk ${firstDisk.id}`, () =>
      t.client.disks.retrieve(firstDisk.id),
    );
    await t.step('disks', 'list disk snapshots', () => t.client.disks.listSnapshots(firstDisk.id));
  },
};

const envGroupsCheck: Check = {
  name: 'envGroups',
  description: 'Environment groups (read-only)',

  async run(t) {
    const listResult = await t.step('envGroups', 'list env groups', () =>
      t.client.envGroups.list(),
    );
    const groups = listResult?.items ?? [];
    const firstGroup = groups[0];

    if (!firstGroup) {
      t.skip('envGroups', 'retrieve env group', 'no env groups found');
      return;
    }

    await t.step('envGroups', `retrieve env group ${firstGroup.id}`, () =>
      t.client.envGroups.retrieve(firstGroup.id),
    );
  },
};

const projectsCheck: Check = {
  name: 'projects',
  description: 'Projects (read-only)',

  async run(t) {
    const listResult = await t.step('projects', 'list projects', () => t.client.projects.list());
    const projects = listResult?.items ?? [];
    const firstProject = projects[0];

    if (!firstProject) {
      t.skip('projects', 'retrieve project', 'no projects found');
      return;
    }

    await t.step('projects', `retrieve project ${firstProject.id}`, () =>
      t.client.projects.retrieve(firstProject.id),
    );
  },
};

const environmentsCheck: Check = {
  name: 'environments',
  description: 'Environments (read-only)',

  async run(t) {
    const listResult = await t.step('environments', 'list environments', () =>
      t.client.environments.list(),
    );
    const environments = listResult?.items ?? [];
    const firstEnvironment = environments[0];

    if (!firstEnvironment) {
      t.skip('environments', 'retrieve environment', 'no environments found');
      return;
    }

    await t.step('environments', `retrieve environment ${firstEnvironment.id}`, () =>
      t.client.environments.retrieve(firstEnvironment.id),
    );
  },
};

const blueprintsCheck: Check = {
  name: 'blueprints',
  description: 'Blueprints + syncs (read-only)',

  async run(t) {
    const listResult = await t.step('blueprints', 'list blueprints', () =>
      t.client.blueprints.list(),
    );
    const blueprints = listResult?.items ?? [];
    const firstBlueprint = blueprints[0];

    if (!firstBlueprint) {
      t.skip('blueprints', 'retrieve blueprint', 'no blueprints found');
      t.skip('blueprints', 'list blueprint syncs', 'no blueprints found');
      return;
    }

    await t.step('blueprints', `retrieve blueprint ${firstBlueprint.id}`, () =>
      t.client.blueprints.retrieve(firstBlueprint.id),
    );
    await t.step('blueprints', 'list blueprint syncs', () =>
      t.client.blueprints.listSyncs(firstBlueprint.id),
    );
  },
};

const registryCredentialsCheck: Check = {
  name: 'registryCredentials',
  description: 'Registry credentials (read-only)',

  async run(t) {
    const listResult = await t.step('registryCredentials', 'list registry credentials', () =>
      t.client.registryCredentials.list(),
    );
    const credentials = listResult?.items ?? [];
    const firstCredential = credentials[0];

    if (!firstCredential) {
      t.skip(
        'registryCredentials',
        'retrieve registry credential',
        'no registry credentials found',
      );
      return;
    }

    await t.step('registryCredentials', `retrieve registry credential ${firstCredential.id}`, () =>
      t.client.registryCredentials.retrieve(firstCredential.id),
    );
  },
};

const webhooksCheck: Check = {
  name: 'webhooks',
  description: 'Webhooks + events (read-only)',

  async run(t) {
    const listResult = await t.step('webhooks', 'list webhooks', () => t.client.webhooks.list());
    const webhooks = listResult?.items ?? [];
    const firstWebhook = webhooks[0];

    if (!firstWebhook) {
      t.skip('webhooks', 'retrieve webhook', 'no webhooks found');
      t.skip('webhooks', 'list webhook events', 'no webhooks found');
      return;
    }

    await t.step('webhooks', `retrieve webhook ${firstWebhook.id}`, () =>
      t.client.webhooks.retrieve(firstWebhook.id),
    );
    await t.step('webhooks', 'list webhook events', () =>
      t.client.webhooks.listEvents(firstWebhook.id),
    );
  },
};

const logsCheck: Check = {
  name: 'logs',
  description: 'Log queries (read-only)',

  async run(t, env) {
    const service = env.service;
    if (!service) {
      t.skip('logs', 'list logs', 'no service available to query logs for');
      return;
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);

    await t.step('logs', 'list logs (last 30 minutes)', () =>
      t.client.logs.list({
        resourceIds: [service.id],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        limit: 20,
      }),
    );
  },
};

const metricsCheck: Check = {
  name: 'metrics',
  description: 'Metric queries (read-only)',

  async run(t, env) {
    const service = env.service;
    if (!service) {
      t.skip('metrics', 'metric queries', 'no service available to query metrics for');
      return;
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
    const params = {
      resourceIds: [service.id],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    await t.step('metrics', 'cpu metrics', () => t.client.metrics.cpu(params));
    await t.step('metrics', 'memory metrics', () => t.client.metrics.memory(params));
    await t.step('metrics', 'bandwidth metrics', () => t.client.metrics.bandwidth(params));
    await t.step('metrics', 'instance count metrics', () => t.client.metrics.instanceCount(params));

    const postgresId = env.postgresId;
    if (postgresId) {
      await t.step('metrics', 'active connections metrics (postgres)', () =>
        t.client.metrics.activeConnections({ ...params, resourceIds: [postgresId] }),
      );
    } else {
      t.skip('metrics', 'active connections metrics (postgres)', 'no postgres database found');
    }
  },
};

const maintenanceCheck: Check = {
  name: 'maintenance',
  description: 'Maintenance runs (read-only)',

  async run(t) {
    const listResult = await t.step('maintenance', 'list maintenance runs', () =>
      t.client.maintenance.list(),
    );
    const runs = listResult?.items ?? [];
    const firstRun = runs[0];

    if (!firstRun) {
      t.skip('maintenance', 'retrieve maintenance run', 'no maintenance runs found');
      return;
    }

    await t.step('maintenance', `retrieve maintenance run ${firstRun.id}`, () =>
      t.client.maintenance.retrieve(firstRun.id),
    );
  },
};

const notificationSettingsCheck: Check = {
  name: 'notificationSettings',
  description: 'Notification settings + overrides (read-only)',

  async run(t, env) {
    if (!env.ownerId) {
      t.skip('notificationSettings', 'notification settings reads', 'no owner ID available');
      return;
    }

    await t.step('notificationSettings', 'retrieve notification settings', () =>
      t.client.notificationSettings.retrieve(env.ownerId as string),
    );
    await t.step('notificationSettings', 'list notification overrides', () =>
      t.client.notificationSettings.listOverrides(),
    );

    if (!env.service) {
      t.skip(
        'notificationSettings',
        'retrieve service notification override',
        'no service available',
      );
      return;
    }

    // A 404 here just means no service-specific override is configured, which
    // is normal — treat it as a skip rather than a failure.
    if (t.options.delay > 0) {
      await sleep(t.options.delay);
    }
    try {
      await t.client.notificationSettings.retrieveServiceOverride(env.service.id);
      t.results.push({
        check: 'notificationSettings',
        step: 'retrieve service notification override',
        status: 'pass',
      });
      console.log(`  ${colors.green}✓${colors.reset} retrieve service notification override`);
    } catch (error) {
      if (error instanceof RenderNotFoundError) {
        t.skip(
          'notificationSettings',
          'retrieve service notification override',
          'no service-specific override configured',
        );
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        const { kind, httpStatus } = classifyFailure(error);
        t.results.push({
          check: 'notificationSettings',
          step: 'retrieve service notification override',
          status: 'fail',
          failureKind: kind,
          httpStatus,
          error: err,
        });
        const statusTag = httpStatus !== undefined ? ` [HTTP ${httpStatus}]` : '';
        console.log(
          `  ${colors.red}✗ retrieve service notification override${statusTag}${colors.reset}`,
        );
        console.log(`    ${colors.dim}${truncate(err.message)}${colors.reset}`);
      }
    }
  },
};

const auditLogsCheck: Check = {
  name: 'auditLogs',
  description: 'Audit logs (read-only)',

  async run(t, env) {
    if (!env.ownerId) {
      t.skip('auditLogs', 'list audit logs', 'no owner ID available');
      return;
    }

    await t.step('auditLogs', 'list audit logs for owner', () =>
      t.client.auditLogs.listForOwner(env.ownerId as string, { limit: 20 }),
    );
  },
};

const eventsCheck: Check = {
  name: 'events',
  description: 'Events (retrieve-only)',

  async run(t) {
    // The events resource only exposes retrieve-by-id and there is no list
    // endpoint, so there is no read-only way to discover an event ID.
    t.skip('events', 'retrieve event', 'events API is retrieve-only; no event ID source');
  },
};

// ============================================================================
// Check registry
// ============================================================================

const ALL_CHECKS: Check[] = [
  usersCheck,
  workspacesCheck,
  servicesCheck,
  serviceDeploysCheck,
  serviceCustomDomainsCheck,
  serviceEnvVarsCheck,
  serviceSecretFilesCheck,
  serviceHeadersCheck,
  serviceRoutesCheck,
  serviceJobsCheck,
  postgresCheck,
  keyValueCheck,
  redisCheck,
  disksCheck,
  envGroupsCheck,
  projectsCheck,
  environmentsCheck,
  blueprintsCheck,
  registryCredentialsCheck,
  webhooksCheck,
  logsCheck,
  metricsCheck,
  maintenanceCheck,
  notificationSettingsCheck,
  auditLogsCheck,
  eventsCheck,
];

// ============================================================================
// Reporting
// ============================================================================

function printSummary(results: StepResult[], totalDuration: number): void {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail');
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('----------------------------------------');
  if (failed.length === 0) {
    console.log(
      `${colors.green}${colors.bold}Results: ${passed} passed${colors.reset}` +
        `, ${skipped} skipped ${colors.dim}(${totalDuration.toFixed(1)}s)${colors.reset}`,
    );
    return;
  }

  console.log(
    `${colors.red}${colors.bold}Results: ${passed} passed, ${failed.length} failed` +
      `${colors.reset}, ${skipped} skipped ${colors.dim}(${totalDuration.toFixed(1)}s)${colors.reset}`,
  );

  const schemaFailures = failed.filter((r) => r.failureKind === 'schema');
  const apiFailures = failed.filter((r) => r.failureKind === 'api');
  const otherFailures = failed.filter((r) => r.failureKind === 'other');

  if (schemaFailures.length > 0) {
    console.log('');
    console.log(
      `${colors.red}${colors.bold}SCHEMA FAILURES — responses don't match client schemas (fix these):${colors.reset}`,
    );
    for (const result of schemaFailures) {
      console.log(`  ${colors.red}[${result.check}] ${result.step}${colors.reset}`);
      console.log(`    ${truncate(result.error?.message ?? '')}`);
    }
  }

  if (apiFailures.length > 0) {
    console.log('');
    console.log(`${colors.yellow}${colors.bold}API FAILURES:${colors.reset}`);
    for (const result of apiFailures) {
      console.log(
        `  ${colors.yellow}[${result.check}] ${result.step} [HTTP ${result.httpStatus}]${colors.reset}`,
      );
      console.log(`    ${colors.dim}${truncate(result.error?.message ?? '')}${colors.reset}`);
    }
  }

  if (otherFailures.length > 0) {
    console.log('');
    console.log(`${colors.magenta}${colors.bold}OTHER FAILURES:${colors.reset}`);
    for (const result of otherFailures) {
      console.log(`  ${colors.magenta}[${result.check}] ${result.step}${colors.reset}`);
      console.log(`    ${colors.dim}${truncate(result.error?.message ?? '')}${colors.reset}`);
    }
  }

  console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    console.log('Available checks:');
    console.log('');
    const maxNameLen = Math.max(...ALL_CHECKS.map((c) => c.name.length));
    for (const check of ALL_CHECKS) {
      console.log(
        `  ${colors.cyan}${check.name.padEnd(maxNameLen)}${colors.reset}  ${check.description}`,
      );
    }
    console.log('');
    return;
  }

  const apiKey = process.env.RENDER_API_KEY ?? '';
  if (!apiKey) {
    console.error(
      `${colors.red}Error: RENDER_API_KEY environment variable is required${colors.reset}`,
    );
    console.error('');
    console.error('Usage:');
    console.error('  RENDER_API_KEY=rnd_xxx bun run scripts/read-smoke-test.ts');
    process.exit(1);
  }

  const debug = process.env.RENDER_DEBUG === 'true' || process.env.RENDER_DEBUG === '1';
  const client = new RenderClient({
    apiKey,
    timeout: options.timeout,
    debug,
  });

  let checksToRun = ALL_CHECKS;
  if (options.only && options.only.length > 0) {
    checksToRun = ALL_CHECKS.filter((c) => options.only?.includes(c.name));
    const missing = options.only.filter((name) => !ALL_CHECKS.some((c) => c.name === name));
    if (missing.length > 0) {
      console.error(`${colors.red}Unknown checks: ${missing.join(', ')}${colors.reset}`);
      console.error('Run with --list to see available checks');
      process.exit(1);
    }
  }
  if (options.skip && options.skip.length > 0) {
    checksToRun = checksToRun.filter((c) => !options.skip?.includes(c.name));
  }

  const run = new SmokeRun(client, options);
  const env: CheckEnv = {};

  console.log(colors.cyan);
  console.log('========================================');
  console.log('   Render API Read-Only Smoke Test');
  console.log('========================================');
  console.log(colors.reset);
  console.log(`Running ${checksToRun.length} check${checksToRun.length !== 1 ? 's' : ''}...`);
  console.log('');

  const startTime = Date.now();
  for (const check of checksToRun) {
    console.log(
      `${colors.cyan}[${check.name}]${colors.reset} ${colors.dim}${check.description}${colors.reset}`,
    );
    try {
      await check.run(run, env);
    } catch (error) {
      // Checks should handle their own errors, but never let one check
      // abort the whole run.
      const err = error instanceof Error ? error : new Error(String(error));
      const { kind, httpStatus } = classifyFailure(error);
      run.results.push({
        check: check.name,
        step: '(check crashed)',
        status: 'fail',
        failureKind: kind,
        httpStatus,
        error: err,
      });
      console.log(`  ${colors.red}✗ check crashed: ${truncate(err.message)}${colors.reset}`);
    }
    console.log('');
  }

  printSummary(run.results, (Date.now() - startTime) / 1000);

  process.exit(run.results.some((r) => r.status === 'fail') ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
