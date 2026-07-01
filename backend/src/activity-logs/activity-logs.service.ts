import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';

export interface CreateLogParams {
  action: string;
  description?: string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: any;
  userId?: number | null;
  merchantId?: number | null;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(params: CreateLogParams): Promise<ActivityLog> {
    const logEntry = this.activityLogRepository.create({
      action: params.action,
      description: params.description,
      entityName: params.entityName,
      entityId: params.entityId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      payload: params.payload,
      userId: params.userId ?? null,
      merchantId: params.merchantId ?? null,
    });
    return this.activityLogRepository.save(logEntry);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    action?: string;
    entityName?: string;
    userId?: number;
    merchantId?: number;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.activityLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.merchant', 'merchant')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.action) {
      queryBuilder.andWhere('log.action = :action', { action: query.action });
    }

    if (query.entityName) {
      queryBuilder.andWhere('log.entityName = :entityName', { entityName: query.entityName });
    }

    if (query.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: query.userId });
    }

    if (query.merchantId) {
      queryBuilder.andWhere('log.merchantId = :merchantId', { merchantId: query.merchantId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    const cleanedData = data.map(log => {
      if (log.user) {
        const { password, ...cleanUser } = log.user as any;
        log.user = cleanUser;
      }
      if (log.merchant) {
        const { password, ...cleanMerchant } = log.merchant as any;
        log.merchant = cleanMerchant;
      }
      return log;
    });

    return {
      data: cleanedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
