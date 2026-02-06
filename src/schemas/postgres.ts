import { z } from 'zod';
import { RegionSchema, SuspendedStatusSchema, SuspenderTypeSchema } from './common.js';
import { CidrBlockAndDescriptionSchema } from './services.js';

// ============================================================================
// Postgres Enums
// ============================================================================

export const PostgresPlanSchema = z.enum([
  'free',
  'starter',
  'standard',
  'pro',
  'pro_plus',
  'custom',
  'basic_256mb',
  'basic_1gb',
  'basic_4gb',
  'pro_4gb',
  'pro_8gb',
  'pro_16gb',
  'pro_32gb',
  'pro_64gb',
  'pro_128gb',
  'pro_192gb',
  'pro_256gb',
  'pro_384gb',
  'pro_512gb',
  'accelerated_16gb',
  'accelerated_32gb',
  'accelerated_64gb',
  'accelerated_128gb',
  'accelerated_256gb',
  'accelerated_384gb',
  'accelerated_512gb',
  'accelerated_768gb',
  'accelerated_1024gb',
]);
export type PostgresPlan = z.infer<typeof PostgresPlanSchema>;

export const PostgresVersionSchema = z.enum(['11', '12', '13', '14', '15', '16', '17', '18']);
export type PostgresVersion = z.infer<typeof PostgresVersionSchema>;

export const DatabaseRoleSchema = z.enum(['primary', 'replica']);
export type DatabaseRole = z.infer<typeof DatabaseRoleSchema>;

export const DatabaseStatusSchema = z.enum(['creating', 'available', 'unavailable', 'suspended']);
export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;

// ============================================================================
// Read Replicas
// ============================================================================

export const ReadReplicaSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type ReadReplica = z.infer<typeof ReadReplicaSchema>;

export const ReadReplicasSchema = z.array(ReadReplicaSchema);
export type ReadReplicas = z.infer<typeof ReadReplicasSchema>;

export const ReadReplicaInputSchema = z.object({
  name: z.string(),
});
export type ReadReplicaInput = z.infer<typeof ReadReplicaInputSchema>;

export const ReadReplicasInputSchema = z.array(ReadReplicaInputSchema);
export type ReadReplicasInput = z.infer<typeof ReadReplicasInputSchema>;

// ============================================================================
// Postgres Owner
// ============================================================================

export const PostgresOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  type: z.enum(['user', 'team']).optional(),
});
export type PostgresOwner = z.infer<typeof PostgresOwnerSchema>;

// ============================================================================
// Postgres Parameter Overrides
// ============================================================================

export const PostgresParameterOverridesSchema = z.object({
  maxConnections: z.number().optional(),
  sharedBuffers: z.string().optional(),
  workMem: z.string().optional(),
  maintenanceWorkMem: z.string().optional(),
  effectiveCacheSize: z.string().optional(),
});
export type PostgresParameterOverrides = z.infer<typeof PostgresParameterOverridesSchema>;

// ============================================================================
// Postgres
// ============================================================================

export const PostgresSchema = z.object({
  id: z.string(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  databaseName: z.string(),
  databaseUser: z.string(),
  environmentId: z.string().optional(),
  highAvailabilityEnabled: z.boolean(),
  name: z.string(),
  owner: PostgresOwnerSchema,
  plan: PostgresPlanSchema,
  diskSizeGB: z.number().optional(),
  primaryPostgresID: z.string().optional(),
  region: RegionSchema,
  readReplicas: ReadReplicasSchema,
  role: DatabaseRoleSchema,
  status: DatabaseStatusSchema,
  version: PostgresVersionSchema,
  suspended: SuspendedStatusSchema,
  suspenders: z.array(SuspenderTypeSchema),
  dashboardUrl: z.string(),
  diskAutoscalingEnabled: z.boolean(),
});
export type Postgres = z.infer<typeof PostgresSchema>;

export const PostgresWithCursorSchema = z.object({
  postgres: PostgresSchema,
  cursor: z.string(),
});
export type PostgresWithCursor = z.infer<typeof PostgresWithCursorSchema>;

// ============================================================================
// Postgres Connection Info
// ============================================================================

export const PostgresConnectionInfoSchema = z.object({
  internalConnectionString: z.string(),
  externalConnectionString: z.string(),
  pslConnectionString: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
});
export type PostgresConnectionInfo = z.infer<typeof PostgresConnectionInfoSchema>;

// ============================================================================
// Postgres Input Types
// ============================================================================

export const CreatePostgresInputSchema = z.object({
  name: z.string(),
  plan: PostgresPlanSchema,
  ownerId: z.string(),
  version: PostgresVersionSchema,
  databaseName: z.string().optional(),
  databaseUser: z.string().optional(),
  datadogAPIKey: z.string().optional(),
  datadogSite: z.string().optional(),
  enableHighAvailability: z.boolean().optional(),
  environmentId: z.string().optional(),
  diskSizeGB: z.number().optional(),
  enableDiskAutoscaling: z.boolean().optional(),
  region: z.string().optional(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
  parameterOverrides: PostgresParameterOverridesSchema.optional(),
  readReplicas: ReadReplicasInputSchema.optional(),
});
export type CreatePostgresInput = z.infer<typeof CreatePostgresInputSchema>;

export const UpdatePostgresInputSchema = z.object({
  name: z.string().optional(),
  plan: PostgresPlanSchema.optional(),
  diskSizeGB: z.number().optional(),
  enableDiskAutoscaling: z.boolean().optional(),
  enableHighAvailability: z.boolean().optional(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
  parameterOverrides: PostgresParameterOverridesSchema.optional(),
  readReplicas: ReadReplicasInputSchema.optional(),
});
export type UpdatePostgresInput = z.infer<typeof UpdatePostgresInputSchema>;

// ============================================================================
// Postgres User
// ============================================================================

export const PostgresUserSchema = z.object({
  username: z.string(),
});
export type PostgresUser = z.infer<typeof PostgresUserSchema>;

export const CreatePostgresUserInputSchema = z.object({
  username: z.string(),
});
export type CreatePostgresUserInput = z.infer<typeof CreatePostgresUserInputSchema>;

// ============================================================================
// Postgres Recovery
// ============================================================================

export const PostgresRecoveryInfoSchema = z.object({
  latestRecoveryTime: z.string().optional(),
});
export type PostgresRecoveryInfo = z.infer<typeof PostgresRecoveryInfoSchema>;

export const RecoverPostgresInputSchema = z.object({
  targetTime: z.string(),
});
export type RecoverPostgresInput = z.infer<typeof RecoverPostgresInputSchema>;

// ============================================================================
// Postgres Export
// ============================================================================

export const PostgresExportSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  createdAt: z.string(),
  url: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type PostgresExport = z.infer<typeof PostgresExportSchema>;

// ============================================================================
// List Params
// ============================================================================

export interface ListPostgresParams {
  name?: string;
  status?: 'creating' | 'available' | 'unavailable' | 'suspended';
  region?: string;
  suspended?: 'suspended' | 'not_suspended';
  createdBefore?: string;
  createdAfter?: string;
  updatedBefore?: string;
  updatedAfter?: string;
  ownerId?: string | string[];
  environmentId?: string;
  includeReplicas?: boolean;
  cursor?: string;
  limit?: number;
}
