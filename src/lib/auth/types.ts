export const ADMIN_ROLES = ['owner', 'admin', 'editor'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminContext {
  userId: string;
  profileId: string;
  email: string | null;
  displayName: string;
  role: AdminRole;
}

/**
 * Capabilities per role. Database RLS policies enforce the same split
 * (see supabase/migrations), so this is defence in depth, not the only check.
 */
export const ROLE_CAPABILITIES = {
  owner: { leads: true, catalogue: true, content: true, settings: true },
  admin: { leads: true, catalogue: true, content: true, settings: true },
  editor: { leads: false, catalogue: false, content: true, settings: false },
} as const satisfies Record<AdminRole, Record<'leads' | 'catalogue' | 'content' | 'settings', boolean>>;

export type Capability = keyof (typeof ROLE_CAPABILITIES)['owner'];

export function can(admin: AdminContext | null, capability: Capability): boolean {
  return admin !== null && ROLE_CAPABILITIES[admin.role][capability];
}
