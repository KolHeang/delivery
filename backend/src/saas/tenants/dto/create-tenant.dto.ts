export class CreateTenantDto {
  name: string;
  status?: 'active' | 'suspended' | 'pending';
  taxId?: string;
  domainName?: string;
  planId?: number;
}
