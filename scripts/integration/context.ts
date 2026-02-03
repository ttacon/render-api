import { RenderClient } from '../../src/index.js';

/**
 * Configuration for integration tests
 */
export interface TestConfig {
  apiKey: string;
  ownerId: string;
  verbose: boolean;
  timeout: number;
  noCleanup: boolean;
  includeExpensive: boolean;
}

/**
 * Test context passed to each test suite
 */
export class TestContext {
  public readonly client: RenderClient;
  public readonly config: TestConfig;
  public readonly runId: string;

  private cleanupFns: Array<() => Promise<void>> = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.client = new RenderClient({
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
    this.runId = this.generateRunId();
  }

  private generateRunId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  get ownerId(): string {
    return this.config.ownerId;
  }

  uniqueName(base: string): string {
    return `test-${this.runId}-${base}`;
  }

  log(message: string, level: 'info' | 'debug' = 'info'): void {
    if (level === 'debug' && !this.config.verbose) {
      return;
    }
    console.log(`  ${message}`);
  }

  registerCleanup(fn: () => Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  async runCleanup(): Promise<void> {
    if (this.config.noCleanup) {
      this.log('Skipping cleanup (--no-cleanup flag)', 'info');
      return;
    }
    for (let i = this.cleanupFns.length - 1; i >= 0; i--) {
      try {
        await this.cleanupFns[i]();
      } catch (error) {
        this.log(`Cleanup warning: ${error}`, 'debug');
      }
    }
    this.cleanupFns = [];
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new AssertionError(message);
    }
  }

  assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new AssertionError(
        `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
  }

  assertDefined<T>(value: T | undefined | null, message: string): T {
    if (value === undefined || value === null) {
      throw new AssertionError(`${message}: value is ${value}`);
    }
    return value;
  }

  assertContains<T>(array: T[], predicate: (item: T) => boolean, message: string): void {
    if (!array.some(predicate)) {
      throw new AssertionError(message);
    }
  }

  async waitFor(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number; message?: string } = {},
  ): Promise<void> {
    const { timeout = 60000, interval = 2000, message = 'Condition not met' } = options;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }
    throw new TimeoutError(`${message} (timeout: ${timeout}ms)`);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function parseConfig(
  args: string[],
): TestConfig & { only?: string[]; skip?: string[]; list?: boolean } {
  // Handle --help and --list early (before requiring env vars)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const listMode = args.includes('--list');
  const apiKey = process.env.RENDER_API_KEY ?? '';
  const ownerId = process.env.RENDER_OWNER_ID ?? '';

  if (!listMode) {
    if (!apiKey) {
      console.error('\x1b[31mError: RENDER_API_KEY environment variable is required\x1b[0m');
      console.error('');
      console.error('Usage:');
      console.error(
        '  RENDER_API_KEY=rnd_xxx RENDER_OWNER_ID=tea_xxx bun run scripts/integration-test.ts',
      );
      process.exit(1);
    }
    if (!ownerId) {
      console.error('\x1b[31mError: RENDER_OWNER_ID environment variable is required\x1b[0m');
      console.error('');
      console.error('This is your workspace/team ID (starts with "tea-" or "usr-")');
      console.error('You can find it by running: bun run repl');
      console.error('Then: await render.workspaces.list()');
      process.exit(1);
    }
  }

  const config: TestConfig & { only?: string[]; skip?: string[]; list?: boolean } = {
    apiKey,
    ownerId,
    verbose: false,
    timeout: 30000,
    noCleanup: false,
    includeExpensive: false,
    list: listMode,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--no-cleanup':
        config.noCleanup = true;
        break;
      case '--include-expensive':
        config.includeExpensive = true;
        break;
      case '--only':
        if (args[i + 1]) {
          config.only = args[++i].split(',').map((s) => s.trim());
        }
        break;
      case '--skip':
        if (args[i + 1]) {
          config.skip = args[++i].split(',').map((s) => s.trim());
        }
        break;
      case '--timeout':
        if (args[i + 1]) {
          config.timeout = parseInt(args[++i], 10);
        }
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Render API Integration Tests

Usage:
  RENDER_API_KEY=xxx RENDER_OWNER_ID=xxx bun run scripts/integration-test.ts [options]

Required Environment Variables:
  RENDER_API_KEY     Your Render API key
  RENDER_OWNER_ID    Workspace/team ID for creating resources

Options:
  --only <suites>       Only run specified test suites (comma-separated)
  --skip <suites>       Skip specified test suites (comma-separated)
  --list                List all available test suites
  --include-expensive   Include expensive tests (postgres, keyValue)
  --timeout <ms>        Request timeout in ms (default: 30000)
  --no-cleanup          Don't cleanup created resources (for debugging)
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Examples:
  # Run all tests
  bun run scripts/integration-test.ts

  # Run only specific suites
  bun run scripts/integration-test.ts --only projects,envGroups

  # Skip slow tests
  bun run scripts/integration-test.ts --skip services

  # Include database tests
  bun run scripts/integration-test.ts --include-expensive
`);
}
