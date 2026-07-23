import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../roles/permission.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ExpenseType)
    private expenseTypeRepo: Repository<ExpenseType>,
    @InjectRepository(IncomeType)
    private incomeTypeRepo: Repository<IncomeType>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
  ) { }

  async onApplicationBootstrap() {
    await this.seedRolesAndPermissions();
    await this.seedUsers();
    await this.seedExpenseTypes();
    await this.seedIncomeTypes();
  }

  private async seedRolesAndPermissions() {
    const perms = [
      // Orders
      { name: 'orders.create', description: 'Create dynamic orders' },
      { name: 'orders.read', description: 'View orders' },
      { name: 'orders.update', description: 'Update orders' },
      { name: 'orders.delete', description: 'Delete orders' },

      // Users
      { name: 'users.create', description: 'Create users' },
      { name: 'users.read', description: 'View users' },
      { name: 'users.update', description: 'Update users' },
      { name: 'users.delete', description: 'Delete users' },
      { name: 'users.manage', description: 'Manage users and roles' },

      // Drivers
      { name: 'drivers.create', description: 'Create drivers' },
      { name: 'drivers.read', description: 'View drivers' },
      { name: 'drivers.update', description: 'Update drivers' },
      { name: 'drivers.delete', description: 'Delete drivers' },

      // Merchants
      { name: 'merchants.create', description: 'Create merchants' },
      { name: 'merchants.read', description: 'View merchants' },
      { name: 'merchants.update', description: 'Update merchants' },
      { name: 'merchants.delete', description: 'Delete merchants' },

      // Zones
      { name: 'zones.create', description: 'Create zones' },
      { name: 'zones.read', description: 'View zones' },
      { name: 'zones.update', description: 'Update zones' },
      { name: 'zones.delete', description: 'Delete zones' },

      // Vehicles
      { name: 'vehicles.create', description: 'Create vehicles' },
      { name: 'vehicles.read', description: 'View vehicles' },
      { name: 'vehicles.update', description: 'Update vehicles' },
      { name: 'vehicles.delete', description: 'Delete vehicles' },

      // Expenses
      { name: 'expenses.create', description: 'Create expenses' },
      { name: 'expenses.read', description: 'View expenses' },
      { name: 'expenses.update', description: 'Update expenses' },
      { name: 'expenses.delete', description: 'Delete expenses' },

      // Incomes
      { name: 'incomes.create', description: 'Create incomes' },
      { name: 'incomes.read', description: 'View incomes' },
      { name: 'incomes.update', description: 'Update incomes' },
      { name: 'incomes.delete', description: 'Delete incomes' },

      // Payments
      { name: 'payments.create', description: 'Create payments' },
      { name: 'payments.read', description: 'View payments' },
      { name: 'payments.update', description: 'Update payments' },
      { name: 'payments.delete', description: 'Delete payments' },

      // Reports
      { name: 'reports.view', description: 'View statistics and reports' },

      // Settings
      { name: 'settings.manage', description: 'Manage system settings' },
    ];

    const existingPerms = await this.permissionRepo.find();
    const existingNames = new Set(existingPerms.map(p => p.name));
    const toInsert = perms.filter(p => !existingNames.has(p.name));
    if (toInsert.length > 0) {
      await this.permissionRepo.save(this.permissionRepo.create(toInsert));
      this.logger.log(`✅ ${toInsert.length} new permissions seeded`);
    }

    const allPerms = await this.permissionRepo.find();
    const readPerms = allPerms.filter(p => p.name.includes('.read') || p.name.includes('.view'));

    // Admin Role
    let adminRole = await this.roleRepo.findOne({ where: { name: 'admin' }, relations: { permissions: true } });
    if (adminRole) {
      adminRole.permissions = allPerms;
      await this.roleRepo.save(adminRole);
    } else {
      adminRole = this.roleRepo.create({
        name: 'admin',
        description: 'Administrator role with full access',
        permissions: allPerms,
      });
      await this.roleRepo.save(adminRole);
    }

    // Staff Role
    let staffRole = await this.roleRepo.findOne({ where: { name: 'staff' }, relations: { permissions: true } });
    const staffPerms = allPerms.filter(p => !p.name.startsWith('users.') && !p.name.startsWith('settings.'));
    if (staffRole) {
      staffRole.permissions = staffPerms;
      await this.roleRepo.save(staffRole);
    } else {
      staffRole = this.roleRepo.create({
        name: 'staff',
        description: 'User role for managing daily operations',
        permissions: staffPerms,
      });
      await this.roleRepo.save(staffRole);
    }

    // Driver Role
    let driverRole = await this.roleRepo.findOne({ where: { name: 'driver' }, relations: { permissions: true } });
    if (driverRole) {
      driverRole.permissions = readPerms;
      await this.roleRepo.save(driverRole);
    } else {
      driverRole = this.roleRepo.create({
        name: 'driver',
        description: 'Driver role for pickup and deliveries',
        permissions: readPerms,
      });
      await this.roleRepo.save(driverRole);
    }

    // Merchant Role
    let merchantRole = await this.roleRepo.findOne({ where: { name: 'merchant' }, relations: { permissions: true } });
    if (merchantRole) {
      merchantRole.permissions = readPerms;
      await this.roleRepo.save(merchantRole);
    } else {
      merchantRole = this.roleRepo.create({
        name: 'merchant',
        description: 'Merchant role for shops and owners',
        permissions: readPerms,
      });
      await this.roleRepo.save(merchantRole);
    }

    this.logger.log('✅ Roles and permissions successfully synchronized');
  }

  private async seedUsers() {
    const count = await this.userRepo.count({
      where: { role: In(['admin', 'staff']) },
    });
    if (count > 0) return;

    const adminRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
    const staffRole = await this.roleRepo.findOne({ where: { name: 'staff' } });

    const users = [
      {
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: await bcrypt.hash('123456', 10),
        role: 'admin' as const,
        roleId: adminRole?.id,
        phone: '012-000-001',
      },
      {
        name: 'UserMember',
        email: 'staff@gmail.com',
        password: await bcrypt.hash('123456', 10),
        role: 'staff' as const,
        roleId: staffRole?.id,
        phone: '012-000-002',
      },
    ];
    await this.userRepo.save(this.userRepo.create(users));
    this.logger.log('✅ Users seeded');
  }


  private async seedExpenseTypes() {
    const count = await this.expenseTypeRepo.count();
    if (count > 0) return;
    const types = [
      { name: 'Office Rent', description: 'Monthly rent for headquarters' },
      { name: 'Fuel', description: 'Driver fuel reimbursement' },
      { name: 'Marketing', description: 'Facebook ads and promotions' },
      { name: 'Salaries', description: 'Userand driver base salaries' },
      { name: 'Maintenance', description: 'Vehicle repair and maintenance' },
    ];
    await this.expenseTypeRepo.save(this.expenseTypeRepo.create(types));
    this.logger.log('✅ Expense Types seeded');
  }

  private async seedIncomeTypes() {
    const count = await this.incomeTypeRepo.count();
    if (count > 0) return;
    const types = [
      { name: 'Delivery Fees', description: 'Earnings from shipping parcels' },
      {
        name: 'Merchant Commission',
        description: 'Platform fee percentage from sales',
      },
      { name: 'Sponsorship', description: 'Branding partner sponsorships' },
      { name: 'Storage Fees', description: 'Warehousing charges for shops' },
    ];
    await this.incomeTypeRepo.save(this.incomeTypeRepo.create(types));
    this.logger.log('✅ Income Types seeded');
  }
}
