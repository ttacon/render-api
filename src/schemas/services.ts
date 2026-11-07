import { z } from 'zod';
import {
  AutoDeploySchema,
  BuildFilterSchema,
  BuildPlanSchema,
  EnvVarInputSchema,
  ImageSchema,
  NotifySettingSchema,
  PaidPlanSchema,
  PlanSchema,
  RegionSchema,
  RegistryCredentialSummarySchema,
  SecretFileInputSchema,
  ServiceRuntimeSchema,
  ServiceTypeSchema,
  SuspendedStatusSchema,
  SuspenderTypeSchema,
} from './common.js';

// ============================================================================
// Service-specific Types
// ============================================================================

const subdomainPolicySchemaEnum = z.enum(['allow', 'disallow', 'enabled']);

export const MaintenanceModeSchema = z.object({
  enabled: z.boolean().optional(),
  uri: z.string().optional(),
});
export type MaintenanceMode = z.infer<typeof MaintenanceModeSchema>;

export const CidrBlockAndDescriptionSchema = z.object({
  cidrBlock: z.string(),
  description: z.string().optional(),
});
export type CidrBlockAndDescription = z.infer<typeof CidrBlockAndDescriptionSchema>;

export const ServerPortSchema = z.object({
  port: z.number(),
  protocol: z.enum(['TCP', 'UDP']),
});
export type ServerPort = z.infer<typeof ServerPortSchema>;

export const SshAddressSchema = z.string();
export type SshAddress = z.infer<typeof SshAddressSchema>;

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const CacheSchema = z.object({
  enabled: z.boolean().optional(),
  sizeInMb: z.number().optional(),
});
export type Cache = z.infer<typeof CacheSchema>;

// ============================================================================
// Disk
// ============================================================================

export const ServiceDiskSchema = z.object({
  name: z.string(),
  sizeGB: z.number(),
  mountPath: z.string(),
});
export type ServiceDisk = z.infer<typeof ServiceDiskSchema>;

export const ServiceDiskResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sizeGB: z.number(),
  mountPath: z.string(),
});
export type ServiceDiskResponse = z.infer<typeof ServiceDiskResponseSchema>;

// ============================================================================
// Autoscaling
// ============================================================================

export const AutoscalingCriterionSchema = z.object({
  enabled: z.boolean(),
  percentage: z.number(),
});
export type AutoscalingCriterion = z.infer<typeof AutoscalingCriterionSchema>;

export const AutoscalingCriteriaSchema = z.object({
  cpu: AutoscalingCriterionSchema,
  memory: AutoscalingCriterionSchema,
});
export type AutoscalingCriteria = z.infer<typeof AutoscalingCriteriaSchema>;

export const AutoscalingSchema = z.object({
  enabled: z.boolean(),
  min: z.number(),
  max: z.number(),
  criteria: AutoscalingCriteriaSchema,
});
export type Autoscaling = z.infer<typeof AutoscalingSchema>;

export const AutoscalingInputSchema = z.object({
  enabled: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  criteria: z
    .object({
      cpu: z
        .object({
          enabled: z.boolean().optional(),
          percentage: z.number().optional(),
        })
        .optional(),
      memory: z
        .object({
          enabled: z.boolean().optional(),
          percentage: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type AutoscalingInput = z.infer<typeof AutoscalingInputSchema>;

// ============================================================================
// Environment-specific Details
// ============================================================================

export const NativeEnvironmentDetailsSchema = z.object({
  buildCommand: z.string(),
  startCommand: z.string(),
  preDeployCommand: z.string().optional(),
});
export type NativeEnvironmentDetails = z.infer<typeof NativeEnvironmentDetailsSchema>;

export const NativeEnvironmentDetailsPOSTSchema = z.object({
  buildCommand: z.string(),
  startCommand: z.string(),
});
export type NativeEnvironmentDetailsPOST = z.infer<typeof NativeEnvironmentDetailsPOSTSchema>;

export const RegistryCredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  registry: z.enum(['GITHUB', 'GITLAB', 'DOCKER']),
});
export type RegistryCredential = z.infer<typeof RegistryCredentialSchema>;

export const DockerDetailsSchema = z.object({
  dockerCommand: z.string(),
  dockerContext: z.string(),
  dockerfilePath: z.string(),
  preDeployCommand: z.string().optional(),
  registryCredential: RegistryCredentialSchema.optional(),
});
export type DockerDetails = z.infer<typeof DockerDetailsSchema>;

export const DockerDetailsPOSTSchema = z.object({
  dockerCommand: z.string().optional(),
  dockerContext: z.string().optional(),
  dockerfilePath: z.string().optional(),
  registryCredentialId: z.string().optional(),
});
export type DockerDetailsPOST = z.infer<typeof DockerDetailsPOSTSchema>;

export const EnvSpecificDetailsSchema = z.union([
  DockerDetailsSchema,
  NativeEnvironmentDetailsSchema,
]);
export type EnvSpecificDetails = z.infer<typeof EnvSpecificDetailsSchema>;

export const EnvSpecificDetailsPOSTSchema = z.union([
  DockerDetailsPOSTSchema,
  NativeEnvironmentDetailsPOSTSchema,
]);
export type EnvSpecificDetailsPOST = z.infer<typeof EnvSpecificDetailsPOSTSchema>;

// ============================================================================
// Previews
// ============================================================================

export const PreviewsSchema = z.object({
  generation: z.enum(['first', 'second', 'off']).optional(),
});
export type Previews = z.infer<typeof PreviewsSchema>;

// ============================================================================
// Service Details by Type
// ============================================================================

// Web Service Details
export const WebServiceDetailsSchema = z.object({
  autoscaling: AutoscalingSchema.optional(),
  cache: CacheSchema.optional(),
  disk: ServiceDiskResponseSchema.optional(),
  env: z.string().optional(), // deprecated
  runtime: ServiceRuntimeSchema,
  envSpecificDetails: EnvSpecificDetailsSchema,
  healthCheckPath: z.string(),
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
  maintenanceMode: MaintenanceModeSchema.optional(),
  numInstances: z.number(),
  openPorts: z.array(ServerPortSchema),
  parentServer: ResourceSchema.optional(),
  plan: PlanSchema,
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema,
  sshAddress: SshAddressSchema.optional(),
  url: z.string(),
  buildPlan: BuildPlanSchema,
  maxShutdownDelaySeconds: z.number().optional(),
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type WebServiceDetails = z.infer<typeof WebServiceDetailsSchema>;

export const WebServiceDetailsPOSTSchema = z.object({
  runtime: ServiceRuntimeSchema,
  autoscaling: AutoscalingInputSchema.optional(),
  disk: ServiceDiskSchema.optional(),
  env: z.string().optional(), // deprecated
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  healthCheckPath: z.string().optional(),
  maintenanceMode: MaintenanceModeSchema.optional(),
  numInstances: z.number().optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  maxShutdownDelaySeconds: z.number().optional(),
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type WebServiceDetailsPOST = z.infer<typeof WebServiceDetailsPOSTSchema>;

export const WebServiceDetailsPATCHSchema = z.object({
  autoscaling: AutoscalingInputSchema.optional(),
  disk: ServiceDiskSchema.nullable().optional(),
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  healthCheckPath: z.string().optional(),
  maintenanceMode: MaintenanceModeSchema.optional(),
  numInstances: z.number().optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  runtime: ServiceRuntimeSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  maxShutdownDelaySeconds: z.number().optional(),
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type WebServiceDetailsPATCH = z.infer<typeof WebServiceDetailsPATCHSchema>;

// Private Service Details (similar to web service but without URL)
export const PrivateServiceDetailsSchema = z.object({
  autoscaling: AutoscalingSchema.optional(),
  disk: ServiceDiskResponseSchema.optional(),
  env: z.string().optional(),
  runtime: ServiceRuntimeSchema,
  envSpecificDetails: EnvSpecificDetailsSchema,
  ipAllowList: z.array(CidrBlockAndDescriptionSchema).optional(),
  numInstances: z.number(),
  openPorts: z.array(ServerPortSchema),
  parentServer: ResourceSchema.optional(),
  plan: PlanSchema,
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema,
  buildPlan: BuildPlanSchema,
  maxShutdownDelaySeconds: z.number().optional(),
});
export type PrivateServiceDetails = z.infer<typeof PrivateServiceDetailsSchema>;

export const PrivateServiceDetailsPOSTSchema = z.object({
  runtime: ServiceRuntimeSchema,
  autoscaling: AutoscalingInputSchema.optional(),
  disk: ServiceDiskSchema.optional(),
  env: z.string().optional(),
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  numInstances: z.number().optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  maxShutdownDelaySeconds: z.number().optional(),
});
export type PrivateServiceDetailsPOST = z.infer<typeof PrivateServiceDetailsPOSTSchema>;

export const PrivateServiceDetailsPATCHSchema = WebServiceDetailsPATCHSchema;
export type PrivateServiceDetailsPATCH = z.infer<typeof PrivateServiceDetailsPATCHSchema>;

// Background Worker Details
export const BackgroundWorkerDetailsSchema = z.object({
  autoscaling: AutoscalingSchema.optional(),
  disk: ServiceDiskResponseSchema.optional(),
  env: z.string().optional(),
  runtime: ServiceRuntimeSchema,
  envSpecificDetails: EnvSpecificDetailsSchema,
  numInstances: z.number(),
  parentServer: ResourceSchema.optional(),
  plan: PlanSchema,
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema,
  buildPlan: BuildPlanSchema,
  maxShutdownDelaySeconds: z.number().optional(),
});
export type BackgroundWorkerDetails = z.infer<typeof BackgroundWorkerDetailsSchema>;

export const BackgroundWorkerDetailsPOSTSchema = z.object({
  runtime: ServiceRuntimeSchema,
  autoscaling: AutoscalingInputSchema.optional(),
  disk: ServiceDiskSchema.optional(),
  env: z.string().optional(),
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  numInstances: z.number().optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  region: RegionSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  maxShutdownDelaySeconds: z.number().optional(),
});
export type BackgroundWorkerDetailsPOST = z.infer<typeof BackgroundWorkerDetailsPOSTSchema>;

export const BackgroundWorkerDetailsPATCHSchema = z.object({
  autoscaling: AutoscalingInputSchema.optional(),
  disk: ServiceDiskSchema.nullable().optional(),
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  numInstances: z.number().optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  runtime: ServiceRuntimeSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  maxShutdownDelaySeconds: z.number().optional(),
});
export type BackgroundWorkerDetailsPATCH = z.infer<typeof BackgroundWorkerDetailsPATCHSchema>;

// Static Site Details
export const StaticSiteDetailsSchema = z.object({
  buildCommand: z.string().optional(),
  headers: z.array(z.object({ path: z.string(), name: z.string(), value: z.string() })).optional(),
  publishPath: z.string(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  url: z.string(),
  buildPlan: BuildPlanSchema,
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type StaticSiteDetails = z.infer<typeof StaticSiteDetailsSchema>;

export const StaticSiteDetailsPOSTSchema = z.object({
  buildCommand: z.string(),
  headers: z.array(z.object({ path: z.string(), name: z.string(), value: z.string() })).optional(),
  publishPath: z.string(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type StaticSiteDetailsPOST = z.infer<typeof StaticSiteDetailsPOSTSchema>;

export const StaticSiteDetailsPATCHSchema = z.object({
  buildCommand: z.string().optional(),
  headers: z.array(z.object({ path: z.string(), name: z.string(), value: z.string() })).optional(),
  publishPath: z.string().optional(),
  pullRequestPreviewsEnabled: z.enum(['yes', 'no']).optional(),
  previews: PreviewsSchema.optional(),
  buildPlan: BuildPlanSchema.optional(),
  renderSubdomainPolicy: subdomainPolicySchemaEnum,
});
export type StaticSiteDetailsPATCH = z.infer<typeof StaticSiteDetailsPATCHSchema>;

// Cron Job Details
export const CronJobDetailsSchema = z.object({
  env: z.string().optional(),
  runtime: ServiceRuntimeSchema,
  envSpecificDetails: EnvSpecificDetailsSchema,
  plan: PlanSchema,
  region: RegionSchema,
  schedule: z.string(),
  lastSuccessfulRunAt: z.string().optional(),
  buildPlan: BuildPlanSchema,
});
export type CronJobDetails = z.infer<typeof CronJobDetailsSchema>;

export const CronJobDetailsPOSTSchema = z.object({
  runtime: ServiceRuntimeSchema,
  env: z.string().optional(),
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  region: RegionSchema.optional(),
  schedule: z.string(),
  buildPlan: BuildPlanSchema.optional(),
});
export type CronJobDetailsPOST = z.infer<typeof CronJobDetailsPOSTSchema>;

export const CronJobDetailsPATCHSchema = z.object({
  envSpecificDetails: EnvSpecificDetailsPOSTSchema.optional(),
  plan: PaidPlanSchema.optional(),
  preDeployCommand: z.string().optional(),
  runtime: ServiceRuntimeSchema.optional(),
  schedule: z.string().optional(),
  buildPlan: BuildPlanSchema.optional(),
});
export type CronJobDetailsPATCH = z.infer<typeof CronJobDetailsPATCHSchema>;

// Union of all service details
export const ServiceDetailsSchema = z.union([
  WebServiceDetailsSchema,
  PrivateServiceDetailsSchema,
  BackgroundWorkerDetailsSchema,
  StaticSiteDetailsSchema,
  CronJobDetailsSchema,
]);
export type ServiceDetails = z.infer<typeof ServiceDetailsSchema>;

export const ServiceDetailsPOSTSchema = z.union([
  WebServiceDetailsPOSTSchema,
  PrivateServiceDetailsPOSTSchema,
  BackgroundWorkerDetailsPOSTSchema,
  StaticSiteDetailsPOSTSchema,
  CronJobDetailsPOSTSchema,
]);
export type ServiceDetailsPOST = z.infer<typeof ServiceDetailsPOSTSchema>;

export const ServiceDetailsPATCHSchema = z.union([
  WebServiceDetailsPATCHSchema,
  PrivateServiceDetailsPATCHSchema,
  BackgroundWorkerDetailsPATCHSchema,
  StaticSiteDetailsPATCHSchema,
  CronJobDetailsPATCHSchema,
]);
export type ServiceDetailsPATCH = z.infer<typeof ServiceDetailsPATCHSchema>;

// ============================================================================
// Service
// ============================================================================

export const ServiceSchema = z.object({
  id: z.string(),
  autoDeploy: AutoDeploySchema,
  branch: z.string().optional(),
  buildFilter: BuildFilterSchema.optional(),
  createdAt: z.string(),
  dashboardUrl: z.string(),
  environmentId: z.string().optional(),
  imagePath: z.string().optional(),
  name: z.string(),
  notifyOnFail: NotifySettingSchema,
  ownerId: z.string(),
  registryCredential: RegistryCredentialSummarySchema.optional(),
  repo: z.string().optional(),
  rootDir: z.string(),
  slug: z.string(),
  suspended: SuspendedStatusSchema,
  suspenders: z.array(SuspenderTypeSchema),
  type: ServiceTypeSchema,
  updatedAt: z.string(),
  serviceDetails: ServiceDetailsSchema,
});
export type Service = z.infer<typeof ServiceSchema>;

export const ServiceWithCursorSchema = z.object({
  service: ServiceSchema,
  cursor: z.string(),
});
export type ServiceWithCursor = z.infer<typeof ServiceWithCursorSchema>;

// ============================================================================
// Service Input Types
// ============================================================================

export const CreateServiceInputSchema = z.object({
  type: ServiceTypeSchema,
  name: z.string(),
  ownerId: z.string(),
  repo: z.string().optional(),
  autoDeploy: AutoDeploySchema.optional(),
  branch: z.string().optional(),
  image: ImageSchema.optional(),
  buildFilter: BuildFilterSchema.optional(),
  rootDir: z.string().optional(),
  envVars: z.array(EnvVarInputSchema).optional(),
  secretFiles: z.array(SecretFileInputSchema).optional(),
  environmentId: z.string().optional(),
  serviceDetails: ServiceDetailsPOSTSchema.optional(),
});
export type CreateServiceInput = z.infer<typeof CreateServiceInputSchema>;

export const UpdateServiceInputSchema = z.object({
  autoDeploy: AutoDeploySchema.optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  image: ImageSchema.optional(),
  name: z.string().optional(),
  buildFilter: BuildFilterSchema.optional(),
  rootDir: z.string().optional(),
  serviceDetails: ServiceDetailsPATCHSchema.optional(),
});
export type UpdateServiceInput = z.infer<typeof UpdateServiceInputSchema>;

// ============================================================================
// Service Response Types
// ============================================================================

export const ServiceAndDeploySchema = z.object({
  service: ServiceSchema,
  deployId: z.string().optional(),
});
export type ServiceAndDeploy = z.infer<typeof ServiceAndDeploySchema>;

// ============================================================================
// Service List Params
// ============================================================================

export interface ListServicesParams {
  name?: string;
  type?: string | string[];
  environmentId?: string;
  env?: string;
  region?: string;
  suspended?: 'suspended' | 'not_suspended';
  createdBefore?: string;
  createdAfter?: string;
  updatedBefore?: string;
  updatedAfter?: string;
  ownerId?: string | string[];
  includePreviews?: boolean;
  cursor?: string;
  limit?: number;
}

// ============================================================================
// Scale Input
// ============================================================================

export const ScaleServiceInputSchema = z.object({
  numInstances: z.number().min(1),
});
export type ScaleServiceInput = z.infer<typeof ScaleServiceInputSchema>;

// ============================================================================
// Service Instance
// ============================================================================

export const ServiceInstanceSchema = z.object({
  instanceId: z.string(),
  podName: z.string().optional(),
  status: z.enum(['running', 'pending', 'failed']).optional(),
  createdAt: z.string().optional(),
});
export type ServiceInstance = z.infer<typeof ServiceInstanceSchema>;

// ============================================================================
// Preview Input
// ============================================================================

export const PreviewServiceInputSchema = z.object({
  imagePath: z.string().optional(),
  plan: PlanSchema.optional(),
  commitId: z.string().optional(),
  name: z.string().optional(),
});
export type PreviewServiceInput = z.infer<typeof PreviewServiceInputSchema>;
