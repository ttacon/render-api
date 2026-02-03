import type { TestSuite } from '../runner.js';

export const webhooksSuite: TestSuite = {
  name: 'webhooks',
  description: 'Webhooks CRUD operations',

  async run(ctx) {
    let webhookId: string | undefined;

    try {
      // CREATE
      ctx.log('Creating webhook...');
      const webhook = await ctx.client.webhooks.create({
        url: 'https://example.com/webhook-test',
      });
      webhookId = webhook.id;
      ctx.assertDefined(webhook.id, 'Webhook has ID');
      ctx.assertEqual(webhook.url, 'https://example.com/webhook-test', 'Webhook URL matches');
      ctx.log(`  Created webhook: ${webhook.id}`, 'debug');

      // RETRIEVE
      ctx.log('Retrieving webhook...');
      const retrieved = await ctx.client.webhooks.retrieve(webhookId);
      ctx.assertEqual(retrieved.id, webhookId, 'Retrieved webhook ID matches');
      ctx.assertEqual(
        retrieved.url,
        'https://example.com/webhook-test',
        'Retrieved webhook URL matches',
      );

      // LIST
      ctx.log('Listing webhooks...');
      const { items } = await ctx.client.webhooks.list();
      ctx.assertContains(items, (w) => w.id === webhookId, 'Webhook appears in list');
      ctx.log(`  Found ${items.length} webhooks`, 'debug');

      // UPDATE
      ctx.log('Updating webhook...');
      const updated = await ctx.client.webhooks.update(webhookId, {
        url: 'https://example.com/webhook-updated',
        enabled: true,
      });
      ctx.assertEqual(updated.url, 'https://example.com/webhook-updated', 'Webhook URL updated');

      // DELETE
      ctx.log('Deleting webhook...');
      await ctx.client.webhooks.delete(webhookId);
      webhookId = undefined; // Mark as cleaned up

      ctx.log('All webhook operations passed');
    } finally {
      // Cleanup on failure
      if (webhookId) {
        ctx.log('Cleaning up webhook...', 'debug');
        await ctx.client.webhooks.delete(webhookId).catch(() => {});
      }
    }
  },
};
