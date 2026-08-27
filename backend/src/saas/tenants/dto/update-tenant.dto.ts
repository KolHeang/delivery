import { TenantStatus } from '../tenant.entity';

export class UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  taxId?: string;
}
