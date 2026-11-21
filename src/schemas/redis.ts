import { z } from 'zod';
import { RegionSchema, SuspendedStatusSchema, SuspenderTypeSchema } from './common.js';
import { CidrBlockAndDescriptionSchema } from './services.js';

// ============================================================================
// Redis (Deprecated)
// ============================================================================

export const RedisPlanSchema = z.enum(['free', 'starter', 'standard', 'pro', 'pro_plus', 'custom']);
export type RedisPlan = z.infer<typeof RedisPlanSchema>;

export const RedisMaxmemoryPolicySchema = z.enum([
  'noeviction',
  'allkeys_lru',
  'allkeys_lfu',
  'volatile_lru',
  'volatile_lfu',
  'allkeys_random',
  'volatile_random',
  'volatile_ttl',
]);
export type RedisMaxmemoryPolicy = z.infer<typeof RedisMaxmemoryPolicySchema>;

export const RedisStatusSchema = z.enum(['creating', 'available', 'unavailable', 'suspended']);
export type RedisStatus = z.infer<typeof RedisStatusSchema>;

export const RedisOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  type: z.enum(['user', 'team']).optional(),
});
export type RedisOwner = z.infer<typeof RedisOwnerSchema>;

export const RedisSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  owner: RedisOwnerSchema,
  region: RegionSchema,
  plan: RedisPlanSchema,
  status: RedisStatusSchema,
  // The deprecated Redis API does not always return these fields,
  // so they are optional to avoid validation failures on responses.
  maxmemoryPolicy: RedisMaxmemoryPolicySchema.optional(),
  suspended: SuspendedStatusSchema.optional(),
  suspenders: z.array(SuspenderTypeSchema).optional(),
  dashboardUrl: z.string(),
  environmentId: z.string().optional(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
});
export type Redis = z.infer<typeof RedisSchema>;

export const RedisWithCursorSchema = z.object({
  redis: RedisSchema,
  cursor: z.string(),
});
export type RedisWithCursor = z.infer<typeof RedisWithCursorSchema>;

export const RedisConnectionInfoSchema = z.object({
  internalConnectionString: z.string(),
  externalConnectionString: z.string(),
});
export type RedisConnectionInfo = z.infer<typeof RedisConnectionInfoSchema>;

export const CreateRedisInputSchema = z.object({
  name: z.string(),
  ownerId: z.string(),
  plan: RedisPlanSchema.optional(),
  region: z.string().optional(),
  environmentId: z.string().optional(),
  maxmemoryPolicy: RedisMaxmemoryPolicySchema.optional(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
});
export type CreateRedisInput = z.infer<typeof CreateRedisInputSchema>;

export const UpdateRedisInputSchema = z.object({
  name: z.string().optional(),
  plan: RedisPlanSchema.optional(),
  maxmemoryPolicy: RedisMaxmemoryPolicySchema.optional(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
});
export type UpdateRedisInput = z.infer<typeof UpdateRedisInputSchema>;

export interface ListRedisParams {
  name?: string;
  status?: 'creating' | 'available' | 'unavailable' | 'suspended';
  region?: string;
  suspended?: 'suspended' | 'not_suspended';
  ownerId?: string | string[];
  environmentId?: string;
  cursor?: string;
  limit?: number;
}
