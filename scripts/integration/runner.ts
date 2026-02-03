import { type TestConfig, TestContext } from './context.js';

/**
 * Test suite definition
 */
export interface TestSuite {
  /** Unique name of the suite (used for --only/--skip flags) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Whether this is an expensive test (requires --include-expensive) */
  expensive?: boolean;
  /** Run the test suite */
  run: (ctx: TestContext) => Promise<void>;
}

/**
 * Result of running a test suite
 */
export interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: Error;
}

/**
 * Colors for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

/**
 * Run all test suites and report results
 */
export async function runTests(
  suites: TestSuite[],
  config: TestConfig & { only?: string[]; skip?: string[] },
): Promise<boolean> {
  // Filter suites based on --only and --skip flags
  let suitesToRun = suites;

  if (config.only && config.only.length > 0) {
    suitesToRun = suites.filter((s) => config.only!.includes(s.name));
    const missing = config.only.filter((name) => !suites.some((s) => s.name === name));
    if (missing.length > 0) {
      console.error(`${colors.red}Unknown test suites: ${missing.join(', ')}${colors.reset}`);
      console.error(`Run with --list to see available suites`);
      return false;
    }
  }

  if (config.skip && config.skip.length > 0) {
    suitesToRun = suitesToRun.filter((s) => !config.skip!.includes(s.name));
  }

  // Filter out expensive tests unless --include-expensive is set
  if (!config.includeExpensive) {
    const expensiveSkipped = suitesToRun.filter((s) => s.expensive);
    if (expensiveSkipped.length > 0) {
      console.log(
        `${colors.dim}Skipping expensive tests: ${expensiveSkipped.map((s) => s.name).join(', ')}${colors.reset}`,
      );
      console.log(`${colors.dim}Use --include-expensive to include them${colors.reset}`);
      console.log('');
    }
    suitesToRun = suitesToRun.filter((s) => !s.expensive);
  }

  if (suitesToRun.length === 0) {
    console.log(`${colors.yellow}No test suites to run${colors.reset}`);
    return true;
  }

  // Print header
  printHeader();
  console.log(`Running ${suitesToRun.length} test suite${suitesToRun.length !== 1 ? 's' : ''}...`);
  console.log('');

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Run each suite
  for (const suite of suitesToRun) {
    const result = await runSuite(suite, config);
    results.push(result);
  }

  // Print summary
  const totalDuration = (Date.now() - startTime) / 1000;
  printSummary(results, totalDuration);

  return results.every((r) => r.passed);
}

/**
 * Run a single test suite
 */
async function runSuite(suite: TestSuite, config: TestConfig): Promise<TestResult> {
  const ctx = new TestContext(config);
  const startTime = Date.now();

  console.log(
    `${colors.cyan}[${suite.name}]${colors.reset} Starting... ${colors.dim}(${suite.description})${colors.reset}`,
  );

  try {
    await suite.run(ctx);
    const duration = (Date.now() - startTime) / 1000;

    console.log(
      `${colors.green}[${suite.name}] PASSED${colors.reset} ${colors.dim}(${duration.toFixed(1)}s)${colors.reset}`,
    );
    console.log('');

    return { suite: suite.name, passed: true, duration };
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    const err = error instanceof Error ? error : new Error(String(error));

    console.log(
      `${colors.red}[${suite.name}] FAILED${colors.reset} ${colors.dim}(${duration.toFixed(1)}s)${colors.reset}`,
    );
    console.log(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    if (config.verbose && err.stack) {
      console.log(`  ${colors.dim}${err.stack}${colors.reset}`);
    }
    console.log('');

    return { suite: suite.name, passed: false, duration, error: err };
  } finally {
    // Always run cleanup
    await ctx.runCleanup();
  }
}

/**
 * Print the test header
 */
function printHeader(): void {
  console.log(colors.cyan);
  console.log('========================================');
  console.log('     Render API Integration Tests      ');
  console.log('========================================');
  console.log(colors.reset);
}

/**
 * Print the test summary
 */
function printSummary(results: TestResult[], totalDuration: number): void {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('----------------------------------------');
  if (failed === 0) {
    console.log(
      `${colors.green}${colors.bold}Results: ${passed} passed${colors.reset} ${colors.dim}(${totalDuration.toFixed(1)}s)${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.red}${colors.bold}Results: ${passed} passed, ${failed} failed${colors.reset} ${colors.dim}(${totalDuration.toFixed(1)}s)${colors.reset}`,
    );

    console.log('');
    console.log(`${colors.red}Failed suites:${colors.reset}`);
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.suite}: ${result.error?.message}`);
    }
  }
  console.log('');
}

/**
 * List all available test suites
 */
export function listSuites(suites: TestSuite[]): void {
  console.log('Available test suites:');
  console.log('');

  const maxNameLen = Math.max(...suites.map((s) => s.name.length));

  for (const suite of suites) {
    const expensiveTag = suite.expensive ? ` ${colors.yellow}[expensive]${colors.reset}` : '';
    console.log(
      `  ${colors.cyan}${suite.name.padEnd(maxNameLen)}${colors.reset}  ${suite.description}${expensiveTag}`,
    );
  }

  console.log('');
  console.log('Usage:');
  console.log('  --only projects,envGroups    Run only specified suites');
  console.log('  --skip services              Skip specified suites');
  console.log('  --include-expensive          Include expensive tests');
  console.log('');
}
