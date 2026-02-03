import type { TestSuite } from '../runner.js';

export const usersSuite: TestSuite = {
  name: 'users',
  description: 'Users (read-only, current user)',

  async run(ctx) {
    // ME
    ctx.log('Retrieving current user...');
    const user = await ctx.client.users.me();
    ctx.assertDefined(user.email, 'User has email');
    ctx.log(`  User: ${user.email}`, 'debug');

    ctx.log('All user operations passed');
  },
};
