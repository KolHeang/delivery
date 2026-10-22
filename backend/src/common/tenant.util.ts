/**
 * Utility to extract effective tenantId from the authenticated request.
 * Enforces security:
 * 1. Regular users ALWAYS use their own JWT tenantId (req.user.tenantId).
 * 2. The x-tenant-id header is ONLY respected if the caller is super_admin.
 */
export function getEffectiveTenantId(req: any): number | undefined {
  if (req?.user?.tenantId) {
    return +req.user.tenantId;
  }
  if (req?.user?.role === 'super_admin' && req?.headers?.['x-tenant-id']) {
    return +req.headers['x-tenant-id'];
  }
  return undefined;
}
