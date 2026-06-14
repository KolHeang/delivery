import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff } from '../users/staff.entity';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Customer } from '../customers/customer.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { Income } from '../incomes/income.entity';
import { IncomeType } from '../incomes/income-type.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Staff) private userRepo: Repository<Staff>,
    @InjectRepository(Zone) private zoneRepo: Repository<Zone>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Staff) private driverRepo: Repository<Staff>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    @InjectRepository(ExpenseType) private expenseTypeRepo: Repository<ExpenseType>,
    @InjectRepository(IncomeType) private incomeTypeRepo: Repository<IncomeType>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUsers();
    await this.seedZones();
    await this.seedVehicles();
    await this.seedDrivers();
    await this.seedMerchants();
    await this.seedExpenseTypes();
    await this.seedIncomeTypes();
  }

  private async seedUsers() {
    const count = await this.userRepo.count({ where: { role: In(['admin', 'staff']) } });
    if (count > 0) return;
    const users = [
      { name: 'Admin User', email: 'admin@gmail.com', password: await bcrypt.hash('123456', 10), role: 'admin' as const, phone: '012-000-001' },
      { name: 'Staff Member', email: 'staff@gmail.com', password: await bcrypt.hash('123456', 10), role: 'staff' as const, phone: '012-000-002' },
    ];
    await this.userRepo.save(this.userRepo.create(users));
    this.logger.log('✅ Users seeded');
  }

  private async seedZones() {
    const count = await this.zoneRepo.count();
    if (count > 0) return;
    const zones = [
      { name: 'Phnom Penh Central', code: 'PPC', price: 2.5, description: 'Khan Daun Penh, Khan 7 Makara', active: true },
      { name: 'Phnom Penh South', code: 'PPS', price: 3.0, description: 'Khan Chamkarmon, Khan Toul Kork', active: true },
      { name: 'Phnom Penh North', code: 'PPN', price: 3.5, description: 'Khan Russey Keo, Khan Prek Pnov', active: true },
      { name: 'Kandal Province', code: 'KDL', price: 5.0, description: 'Ta Khmau, Khsach Kandal', active: true },
      { name: 'Siem Reap', code: 'SRP', price: 8.0, description: 'Siem Reap City & Province', active: true },
      { name: 'Battambang', code: 'BTB', price: 9.0, description: 'Battambang City & Province', active: false },
    ];
    await this.zoneRepo.save(this.zoneRepo.create(zones));
    this.logger.log('✅ Zones seeded');
  }

  private async seedVehicles() {
    const count = await this.vehicleRepo.count();
    if (count > 0) return;
    const vehicles = [
      { plate: '2A-4532', type: 'motorbike', brand: 'Honda', model: 'Wave', year: 2021, status: 'active' },
      { plate: '2B-7891', type: 'motorbike', brand: 'Yamaha', model: 'Fino', year: 2022, status: 'active' },
      { plate: '1A-1234', type: 'car', brand: 'Toyota', model: 'Hilux', year: 2020, status: 'active' },
      { plate: '3C-5678', type: 'motorbike', brand: 'Honda', model: 'PCX', year: 2023, status: 'active' },
      { plate: '2D-9012', type: 'tuk-tuk', brand: 'Generic', model: 'Electric', year: 2022, status: 'maintenance' },
      { plate: '1B-3456', type: 'van', brand: 'Toyota', model: 'Hiace', year: 2019, status: 'active' },
    ];
    await this.vehicleRepo.save(this.vehicleRepo.create(vehicles as any));
    this.logger.log('✅ Vehicles seeded');
  }

  private async seedDrivers() {
    const count = await this.driverRepo.count({ where: { role: 'driver' } });
    if (count > 0) return;
    const zones = await this.zoneRepo.find();
    const vehicles = await this.vehicleRepo.find();
    const getZoneId = (code: string) => zones.find(z => z.code === code)?.id;
    const defaultPassword = await bcrypt.hash('123456', 10);
    const drivers = [
      { name: 'Sok Dara', nameKh: 'សុក ដារា', phone: '012-345-678', email: 'sokdara@email.com', zoneId: getZoneId('PPC'), vehicleId: vehicles[0]?.id, status: 'available' as const, totalDeliveries: 234, rating: 4.8, joinDate: '2022-03-15', salary: 450.00, password: defaultPassword, role: 'driver' as const },
      { name: 'Chan Piseth', nameKh: 'ចាន់ ពិសិទ្ធ', phone: '017-234-567', email: 'chanpiseth@email.com', zoneId: getZoneId('PPS'), vehicleId: vehicles[1]?.id, status: 'on-delivery' as const, totalDeliveries: 189, rating: 4.6, joinDate: '2022-06-20', salary: 400.00, password: defaultPassword, role: 'driver' as const },
      { name: 'Keo Vantha', nameKh: 'កែវ វ័ន្ថា', phone: '011-876-543', email: 'keovantha@email.com', zoneId: getZoneId('PPN'), vehicleId: vehicles[2]?.id, status: 'available' as const, totalDeliveries: 312, rating: 4.9, joinDate: '2021-11-10', salary: 500.00, password: defaultPassword, role: 'driver' as const },
      { name: 'Mao Sreyleak', nameKh: 'មៅ ស្រីលក្ខ', phone: '096-543-210', email: 'maosreyleak@email.com', zoneId: getZoneId('PPC'), vehicleId: vehicles[3]?.id, status: 'offline' as const, totalDeliveries: 98, rating: 4.3, joinDate: '2023-01-05', salary: 350.00, password: defaultPassword, role: 'driver' as const },
      { name: 'Lim Bunna', nameKh: 'លឹម បុណ្ណា', phone: '015-678-901', email: 'limbunna@email.com', zoneId: getZoneId('KDL'), vehicleId: vehicles[5]?.id, status: 'available' as const, totalDeliveries: 456, rating: 4.7, joinDate: '2021-08-22', salary: 550.00, password: defaultPassword, role: 'driver' as const },
      { name: 'Heng Sophal', nameKh: 'ហេង សុផល', phone: '078-901-234', email: 'hengsophal@email.com', zoneId: getZoneId('PPS'), vehicleId: null, status: 'available' as const, totalDeliveries: 67, rating: 4.5, joinDate: '2023-09-14', salary: 380.00, password: defaultPassword, role: 'driver' as const },
    ];
    await this.driverRepo.save(this.driverRepo.create(drivers as any));
    this.logger.log('✅ Drivers seeded');
  }

  private async seedMerchants() {
    const count = await this.merchantRepo.count();
    if (count > 0) return;
    const zones = await this.zoneRepo.find();
    const getZoneId = (code: string) => zones.find(z => z.code === code)?.id;
    const defaultPassword = await bcrypt.hash('123456', 10);
    const merchants = [
      { name: 'Zando Shop', nameKh: 'ហាងហ្សង់ដូ', contact: 'Channy', phone: '012-100-200', email: 'zando@shop.com', address: 'Orussey Market, Phnom Penh', zoneId: getZoneId('PPC'), pricingTier: 'standard', balance: 320.5, password: defaultPassword },
      { name: 'Fashion House KH', nameKh: 'ហ្វេសសិន ហោស៍ ឃេអេច', contact: 'Leakhena', phone: '077-300-400', email: 'fashionkh@email.com', address: 'Russian Market, Phnom Penh', zoneId: getZoneId('PPS'), pricingTier: 'premium', balance: 1250.0, password: defaultPassword },
      { name: 'Tech Zone', nameKh: 'តិច ហ្សូន', contact: 'Piseth', phone: '011-500-600', email: 'techzone@email.com', address: 'Toul Kork, Phnom Penh', zoneId: getZoneId('PPS'), pricingTier: 'standard', balance: 180.75, password: defaultPassword },
      { name: 'Khmer Food Co.', nameKh: 'ក្រុមហ៊ុន ខ្មែរ ហ្វូដ', contact: 'Bopha', phone: '089-700-800', email: 'khmerfood@email.com', address: 'Kandal Market', zoneId: getZoneId('KDL'), pricingTier: 'basic', balance: 895.25, password: defaultPassword },
      { name: 'Beauty & Care', nameKh: 'ប៊ីយូធី & ឃែរ', contact: 'Sreymom', phone: '015-900-100', email: 'beautycare@email.com', address: 'BKK1, Phnom Penh', zoneId: getZoneId('PPS'), pricingTier: 'standard', balance: 240.0, password: defaultPassword },
      { name: 'Angkor Handicraft', nameKh: 'សិប្បកម្មអង្គរ', contact: 'Dara', phone: '078-200-300', email: 'angkor@handicraft.com', address: 'Siem Reap', zoneId: getZoneId('SRP'), pricingTier: 'premium', balance: 450.0, password: defaultPassword },
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
      { name: 'Salaries', description: 'Staff and driver base salaries' },
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
      { name: 'Merchant Commission', description: 'Platform fee percentage from sales' },
      { name: 'Sponsorship', description: 'Branding partner sponsorships' },
      { name: 'Storage Fees', description: 'Warehousing charges for shops' },
    ];
    await this.incomeTypeRepo.save(this.incomeTypeRepo.create(types));
    this.logger.log('✅ Income Types seeded');
  }

}
