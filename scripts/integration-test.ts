#!/usr/bin/env bun

import { parseConfig } from './integration/context.js';
import { listSuites, runTests, type TestSuite } from './integration/runner.js';
import {
  auditLogsSuite,
  blueprintsSuite,
  envGroupsSuite,
  environmentsSuite,
  eventsSuite,
  keyValueSuite,
  postgresSuite,
  projectsSuite,
  servicesSuite,
  usersSuite,
  webhooksSuite,
  workspacesSuite,
} from './integration/suites/index.js';

/**
 * All available test suites in recommended execution order
 */
const allSuites: TestSuite[] = [
  // Read-only tests first (fast, no side effects)
  usersSuite,
  workspacesSuite,

  // Core CRUD tests
  projectsSuite,
  environmentsSuite,
  envGroupsSuite,
  webhooksSuite,

  // Service tests (slower, creates actual resources)
  servicesSuite,

  // Read-only monitoring tests
  auditLogsSuite,
  eventsSuite,
  blueprintsSuite,

  // Expensive tests (databases, require --include-expensive)
  postgresSuite,
  keyValueSuite,
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = parseConfig(args);

  // Handle --list flag
  if (config.list) {
    listSuites(allSuites);
    process.exit(0);
  }

  // Run tests
  const success = await runTests(allSuites, config);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
