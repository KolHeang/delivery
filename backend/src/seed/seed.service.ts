import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.entity';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Customer } from '../customers/customer.entity';
import { Merchant } from '../merchants/merchant.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../roles/permission.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Zone) private zoneRepo: Repository<Zone>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(User) private driverRepo: Repository<User>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
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
    await this.seedDrivers();
    await this.seedMerchants();
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



  private async seedDrivers() {
    const count = await this.driverRepo.count({ where: { role: 'driver' } });
    if (count > 0) return;

    const driverRole = await this.roleRepo.findOne({ where: { name: 'driver' } });
    const zones = await this.zoneRepo.find();
    const vehicles = await this.vehicleRepo.find();
    const getZoneId = (code: string) => zones.find((z) => z.code === code)?.id;
    const defaultPassword = await bcrypt.hash('123456', 10);
    const drivers = [
      {
        name: 'Sok Dara',
        nameKh: 'សុក ដារា',
        phone: '012-345-678',
        email: 'sokdara@email.com',
        zoneId: getZoneId('PPC'),
        vehicleId: vehicles[0]?.id,
        status: 'available' as const,
        totalDeliveries: 234,
        rating: 4.8,
        joinDate: '2022-03-15',
        salary: 450.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
      {
        name: 'Chan Piseth',
        nameKh: 'ចាន់ ពិសិទ្ធ',
        phone: '017-234-567',
        email: 'chanpiseth@email.com',
        zoneId: getZoneId('PPS'),
        vehicleId: vehicles[1]?.id,
        status: 'on-delivery' as const,
        totalDeliveries: 189,
        rating: 4.6,
        joinDate: '2022-06-20',
        salary: 400.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
      {
        name: 'Keo Vantha',
        nameKh: 'កែវ វ័ន្ថា',
        phone: '011-876-543',
        email: 'keovantha@email.com',
        zoneId: getZoneId('PPN'),
        vehicleId: vehicles[2]?.id,
        status: 'available' as const,
        totalDeliveries: 312,
        rating: 4.9,
        joinDate: '2021-11-10',
        salary: 500.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
      {
        name: 'Mao Sreyleak',
        nameKh: 'មៅ ស្រីលក្ខ',
        phone: '096-543-210',
        email: 'maosreyleak@email.com',
        zoneId: getZoneId('PPC'),
        vehicleId: vehicles[3]?.id,
        status: 'offline' as const,
        totalDeliveries: 98,
        rating: 4.3,
        joinDate: '2023-01-05',
        salary: 350.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
      {
        name: 'Lim Bunna',
        nameKh: 'លឹម បុណ្ណា',
        phone: '015-678-901',
        email: 'limbunna@email.com',
        zoneId: getZoneId('KDL'),
        vehicleId: vehicles[5]?.id,
        status: 'available' as const,
        totalDeliveries: 456,
        rating: 4.7,
        joinDate: '2021-08-22',
        salary: 550.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
      {
        name: 'Heng Sophal',
        nameKh: 'ហេង សុផល',
        phone: '078-901-234',
        email: 'hengsophal@email.com',
        zoneId: getZoneId('PPS'),
        vehicleId: null,
        status: 'available' as const,
        totalDeliveries: 67,
        rating: 4.5,
        joinDate: '2023-09-14',
        salary: 380.0,
        password: defaultPassword,
        role: 'driver' as const,
        roleId: driverRole?.id,
      },
    ];
    await this.driverRepo.save(this.driverRepo.create(drivers as any));
    this.logger.log('✅ Drivers seeded');
  }

  private async seedMerchants() {
    const count = await this.merchantRepo.count();
    if (count > 0) return;
    const zones = await this.zoneRepo.find();
    const getZoneId = (code: string) => zones.find((z) => z.code === code)?.id;
    const defaultPassword = await bcrypt.hash('123456', 10);
    const merchants = [
      {
        name: 'Zando Shop',
        nameKh: 'ហាងហ្សង់ដូ',
        contact: 'Channy',
        phone: '012-100-200',
        email: 'zando@shop.com',
        address: 'Orussey Market, Phnom Penh',
        zoneId: getZoneId('PPC'),
        pricingTier: 'standard',
        balance: 320.5,
        password: defaultPassword,
      },
      {
        name: 'Fashion House KH',
        nameKh: 'ហ្វេសសិន ហោស៍ ឃេអេច',
        contact: 'Leakhena',
        phone: '077-300-400',
        email: 'fashionkh@email.com',
        address: 'Russian Market, Phnom Penh',
        zoneId: getZoneId('PPS'),
        pricingTier: 'premium',
        balance: 1250.0,
        password: defaultPassword,
      },
      {
        name: 'Tech Zone',
        nameKh: 'តិច ហ្សូន',
        contact: 'Piseth',
        phone: '011-500-600',
        email: 'techzone@email.com',
        address: 'Toul Kork, Phnom Penh',
        zoneId: getZoneId('PPS'),
        pricingTier: 'standard',
        balance: 180.75,
        password: defaultPassword,
      },
      {
        name: 'Khmer Food Co.',
        nameKh: 'ក្រុមហ៊ុន ខ្មែរ ហ្វូដ',
        contact: 'Bopha',
        phone: '089-700-800',
        email: 'khmerfood@email.com',
        address: 'Kandal Market',
        zoneId: getZoneId('KDL'),
        pricingTier: 'basic',
        balance: 895.25,
        password: defaultPassword,
      },
      {
        name: 'Beauty & Care',
        nameKh: 'ប៊ីយូធី & ឃែរ',
        contact: 'Sreymom',
        phone: '015-900-100',
        email: 'beautycare@email.com',
        address: 'BKK1, Phnom Penh',
        zoneId: getZoneId('PPS'),
        pricingTier: 'standard',
        balance: 240.0,
        password: defaultPassword,
      },
      {
        name: 'Angkor Handicraft',
        nameKh: 'សិប្បកម្មអង្គរ',
        contact: 'Dara',
        phone: '078-200-300',
        email: 'angkor@handicraft.com',
        address: 'Siem Reap',
        zoneId: getZoneId('SRP'),
        pricingTier: 'premium',
        balance: 450.0,
        password: defaultPassword,
      },
    ];
    await this.merchantRepo.save(this.merchantRepo.create(merchants as any));
    this.logger.log('✅ Merchants seeded');
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
