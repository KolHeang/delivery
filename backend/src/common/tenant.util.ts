/**
 * Utility to extract effective tenantId from the authenticated request.
 * Enforces security:
 * 1. Regular users ALWAYS use their own JWT tenantId (req.user.tenantId).
 * 2. The x-tenant-id header is ONLY respected if the caller is a SaaS Platform Admin.
 */
export function getEffectiveTenantId(req: any): number | undefined {
  if (req?.user?.tenantId) {
    return +req.user.tenantId;
  }
  if (
    (req?.user?.isSaasAdmin ||
      ['super_admin', 'superadmin'].includes(req?.user?.role)) &&
    req?.headers?.['x-tenant-id']
  ) {
    return +req.headers['x-tenant-id'];
  }
  return undefined;
}
