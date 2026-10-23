import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable, merge, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto, QueryNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly liveNotifications$ = new Subject<Notification>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async onModuleInit() {
    await this.seedInitialNotificationsIfEmpty();
  }

  async getNotifications(query?: QueryNotificationDto, tenantId?: number, userId?: number) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));

    const qb = this.notificationRepo.createQueryBuilder('notif');

    if (tenantId) {
      qb.andWhere('(notif.tenantId = :tenantId OR notif.tenantId IS NULL)', { tenantId });
    }

    if (userId) {
      qb.andWhere('(notif.userId = :userId OR notif.userId IS NULL)', { userId });
    }

    if (query?.isRead !== undefined && query?.isRead !== '') {
      const isReadBool = query.isRead === true || query.isRead === 'true';
      qb.andWhere('notif.isRead = :isRead', { isRead: isReadBool });
    }

    if (query?.type) {
      qb.andWhere('notif.type = :type', { type: query.type });
    }

    qb.orderBy('notif.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Count unread
    const unreadCountQb = this.notificationRepo
      .createQueryBuilder('notif')
      .where('notif.isRead = false');

    if (tenantId) {
      unreadCountQb.andWhere('(notif.tenantId = :tenantId OR notif.tenantId IS NULL)', { tenantId });
    }
    if (userId) {
      unreadCountQb.andWhere('(notif.userId = :userId OR notif.userId IS NULL)', { userId });
    }

    const unreadCount = await unreadCountQb.getCount();

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(tenantId?: number, userId?: number): Promise<{ unreadCount: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder('notif')
      .where('notif.isRead = false');

    if (tenantId) {
      qb.andWhere('(notif.tenantId = :tenantId OR notif.tenantId IS NULL)', { tenantId });
    }
    if (userId) {
      qb.andWhere('(notif.userId = :userId OR notif.userId IS NULL)', { userId });
    }

    const count = await qb.getCount();
    return { unreadCount: count };
  }

  async markAsRead(id: number, tenantId?: number, userId?: number) {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    if (userId) where.userId = userId;

    const notif = await this.notificationRepo.findOne({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Notification #${id} not found`);
    }

    notif.isRead = true;
    await this.notificationRepo.save(notif);

    return { success: true, id };
  }

  async markAllAsRead(tenantId?: number, userId?: number) {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('isRead = false');

    if (tenantId) {
      qb.andWhere('(tenant_id = :tenantId OR tenant_id IS NULL)', { tenantId });
    }
    if (userId) {
      qb.andWhere('(user_id = :userId OR user_id IS NULL)', { userId });
    }

    const result = await qb.execute();
    return { success: true, count: result.affected || 0 };
  }

  async deleteNotification(id: number, tenantId?: number) {
    const notif = await this.notificationRepo.findOne({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Notification #${id} not found`);
    }

    await this.notificationRepo.delete({ id });
    return { success: true, id };
  }

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notif = this.notificationRepo.create({
      title: dto.title,
      titleKh: dto.titleKh || dto.title,
      body: dto.body,
      bodyKh: dto.bodyKh || dto.body,
      type: dto.type || 'order',
      targetType: dto.targetType || 'parcel',
      targetId: dto.targetId,
      link: dto.link,
      data: dto.data || {},
      tenantId: dto.tenantId || 1,
      userId: dto.userId || null,
      isRead: false,
    });

    const saved: Notification = await this.notificationRepo.save(notif);
    this.liveNotifications$.next(saved);
    return saved;
  }

  getRealtimeNotificationsStream(tenantId?: number): Observable<MessageEvent> {
    const live$ = this.liveNotifications$.asObservable().pipe(
      map((notif) => {
        return {
          data: {
            type: 'notification',
            notification: notif,
            timestamp: new Date().toISOString(),
          },
        } as unknown as MessageEvent;
      }),
    );

    // Heartbeat every 25 seconds
    const ping$ = interval(25000).pipe(
      map(() => ({ data: { type: 'ping', timestamp: new Date().toISOString() } } as unknown as MessageEvent)),
    );

    return merge(live$, ping$);
  }

  /**
   * Automatically seed realistic notifications if table is empty
   */
  private async seedInitialNotificationsIfEmpty() {
    try {
      const count = await this.notificationRepo.count();
      if (count > 0) return;

      const seedData: Partial<Notification>[] = [
        {
          tenantId: 1,
          title: 'New Pickup Request #PB9001',
          titleKh: 'សំណើប្រមូលអីវ៉ាន់ថ្មី #PB9001',
          body: 'Little Girl Studio requested pickup for 4 parcels at Main Shop',
          bodyKh: 'ហាង លីថល ហ្គឺល ស្តូឌីយ៉ូ បានស្នើសុំប្រមូលអីវ៉ាន់ចំនួន ៤ កញ្ចប់',
          type: 'pickup',
          targetType: 'pickup_request',
          targetId: 'PB9001',
          link: '/summary/pickup',
          isRead: false,
        },
        {
          tenantId: 1,
          title: 'Parcel Delivered Successfully #EX90001',
          titleKh: 'កញ្ចប់អីវ៉ាន់បានដឹកជញ្ជូនជោគជ័យ #EX90001',
          body: 'Delivered to Srey Neang (BKK). COD collected: $24.50',
          bodyKh: 'បានដឹកជូនអ្នកនាង ស្រីនាង (បឹងកេងកង) រួចរាល់។ ប្រមូល COD: $24.50',
          type: 'delivery',
          targetType: 'parcel',
          targetId: 'EX90001',
          link: '/delivery',
          isRead: false,
        },
        {
          tenantId: 1,
          title: 'Daily COD Settlement Ready',
          titleKh: 'វិក្កយបត្រទូទាត់ប្រាក់ COD ប្រចាំថ្ងៃ #SETTLE-SHOP-879002',
          body: 'Settlement for Little Girl Studio: $24.50 USD & 98,000 KHR',
          bodyKh: 'ការទូទាត់ប្រាក់ COD ជូនហាង Little Girl Studio: $24.50 USD & 98,000 KHR',
          type: 'settlement',
          targetType: 'settlement',
          targetId: 'SETTLE-SHOP-879002',
          link: '/payment',
          isRead: false,
        },
        {
          tenantId: 1,
          title: 'Driver Assigned to Pickup #PB9002',
          titleKh: 'បានចាត់អ្នកដឹកជញ្ជូនទៅទទួលកញ្ចប់ #PB9002',
          body: 'Driver Sok Dara was assigned to pick up 8 parcels',
          bodyKh: 'អ្នកដឹក សុខ តារា ត្រូវបានចាត់តាំងឱ្យទៅទទួលកញ្ចប់ ៨ អីវ៉ាន់',
          type: 'pickup',
          targetType: 'pickup_request',
          targetId: 'PB9002',
          link: '/summary/pickup',
          isRead: true,
        },
        {
          tenantId: 1,
          title: 'New COD Order Created #CO211020260055',
          titleKh: 'ការបញ្ជាទិញដឹកជញ្ជូនថ្មី #CO211020260055',
          body: 'Destination: Takhmao. COD: $100.00 USD',
          bodyKh: 'គោលដៅ៖ ក្រុងតាខ្មៅ។ ប្រាក់ COD៖ $100.00 USD',
          type: 'order',
          targetType: 'parcel',
          targetId: 'CO211020260055',
          link: '/delivery',
          isRead: true,
        },
        {
          tenantId: 1,
          title: 'System Notice: Daily Backup Completed',
          titleKh: 'ដំណឹងប្រព័ន្ធ៖ ការបម្រុងទុកទិន្នន័យបានជោគជ័យ',
          body: 'E-Express cloud database backup finished at 03:00 AM',
          bodyKh: 'ការបម្រុងទុកទិន្នន័យលើពពករបស់ E-Express បានបញ្ចប់នៅម៉ោង 03:00 ព្រឹក',
          type: 'system',
          targetType: 'system',
          targetId: 'SYS01',
          link: '/dashboard',
          isRead: true,
        },
      ];

      for (const item of seedData) {
        await this.notificationRepo.save(this.notificationRepo.create(item));
      }
      console.log('✅ Seeded initial web notifications successfully.');
    } catch (e: any) {
      console.warn('Could not seed initial notifications:', e?.message || e);
    }
  }
}
