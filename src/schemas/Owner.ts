import { z } from 'zod';

// ============================================================================
// User
// ============================================================================

export const IPAllowlistSchema = z.object({
    cidrBlock: z.string(),
    description: z.string(),  
});
export type IPAllowlist = z.infer<typeof IPAllowlistSchema>;

export const OwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  ipAllowlist: z.array(IPAllowlistSchema).optional(),
  type: z.enum(['user', 'team']),
  twoFactorAuthEnabled: z.boolean().optional(),
});
export type User = z.infer<typeof OwnerSchema>;
