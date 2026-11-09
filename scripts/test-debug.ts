#!/usr/bin/env bun

/**
 * Test script to verify debug logging functionality
 *
 * Usage:
 *   RENDER_API_KEY=xxx bun run scripts/test-debug.ts
 *   RENDER_DEBUG=true RENDER_API_KEY=xxx bun run scripts/test-debug.ts
 */

import { RenderClient } from '../src/index.js';

const API_KEY = process.env.RENDER_API_KEY;
const DEBUG = process.env.RENDER_DEBUG === 'true' || process.env.RENDER_DEBUG === '1';

if (!API_KEY) {
  console.error('\x1b[31mError: RENDER_API_KEY environment variable is required\x1b[0m');
  console.error('');
  console.error('Usage:');
  console.error('  RENDER_API_KEY=xxx bun run scripts/test-debug.ts');
  console.error('');
  console.error('With debug logging:');
  console.error('  RENDER_DEBUG=true RENDER_API_KEY=xxx bun run scripts/test-debug.ts');
  process.exit(1);
}

console.log('Testing debug logging functionality...\n');

if (DEBUG) {
  console.log('\x1b[32m✓ Debug mode is ENABLED (via RENDER_DEBUG env var)\x1b[0m');
  console.log('  You should see detailed [DEBUG] output below\n');
} else {
  console.log('\x1b[33m⚠ Debug mode is DISABLED\x1b[0m');
  console.log('  Run with RENDER_DEBUG=true to see debug output\n');
}

// Create client with programmatic debug setting (overrides env var)
const render = new RenderClient({
  apiKey: API_KEY,
  debug: DEBUG,
});

console.log('───────────────────────────────────────────────────');
console.log('Test 1: Fetching current user info');
console.log('───────────────────────────────────────────────────\n');

try {
  const user = await render.users.me();
  console.log('\x1b[32m✓ Success:\x1b[0m');
  console.log(`  Email: ${user.email}`);
  if (user.name) {
    console.log(`  Name: ${user.name}`);
  }
} catch (error) {
  console.error('\x1b[31m✗ Error:\x1b[0m', error);
  process.exit(1);
}

console.log('\n───────────────────────────────────────────────────');
console.log('Test 2: Listing services (first 5)');
console.log('───────────────────────────────────────────────────\n');

try {
  const { items, hasMore } = await render.services.list({ limit: 5 });
  console.log('\x1b[32m✓ Success:\x1b[0m');
  console.log(`  Found ${items.length} service(s)`);
  console.log(`  Has more: ${hasMore}`);

  if (items.length > 0) {
    console.log('\n  Services:');
    for (const svc of items) {
      console.log(`    - ${svc.name} (${svc.type})`);
    }
  }
} catch (error) {
  console.error('\x1b[31m✗ Error:\x1b[0m', error);
  process.exit(1);
}

console.log('\n───────────────────────────────────────────────────');
console.log('Test 3: Testing error handling (invalid service ID)');
console.log('───────────────────────────────────────────────────\n');

try {
  await render.services.retrieve('srv-invalid-id-12345');
  console.log('\x1b[33m⚠ Expected error but got success\x1b[0m');
} catch (error: any) {
  if (error.status === 404) {
    console.log('\x1b[32m✓ Correctly handled 404 error\x1b[0m');
    console.log(`  Error message: ${error.message}`);
    if (error.requestId) {
      console.log(`  Request ID: ${error.requestId}`);
    }
  } else {
    console.error('\x1b[31m✗ Unexpected error:\x1b[0m', error);
    process.exit(1);
  }
}

console.log('\n───────────────────────────────────────────────────');
console.log('Summary');
console.log('───────────────────────────────────────────────────\n');

if (DEBUG) {
  console.log('\x1b[32m✓ All tests passed with debug logging enabled\x1b[0m');
  console.log('\nDebug output should have shown:');
  console.log('  • Request details (method, URL, headers, body)');
  console.log('  • Response details (status, duration, request ID)');
  console.log('  • Validation progress and results');
  console.log('  • Error details with request IDs');
} else {
  console.log('\x1b[32m✓ All tests passed\x1b[0m');
  console.log('\nTo see detailed debug output, run:');
  console.log('  RENDER_DEBUG=true RENDER_API_KEY=xxx bun run scripts/test-debug.ts');
}

console.log('');
