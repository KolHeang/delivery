import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogsService } from './activity-logs.service';
import { LOG_ACTIVITY_KEY, ActivityOptions } from './activity.decorator';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | any {
    const activityOptions = this.reflector.getAllAndOverride<ActivityOptions>(
      LOG_ACTIVITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!activityOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const userId = user?.role !== 'merchant' ? user?.id : null;
          const merchantId = user?.role === 'merchant' ? user?.id : null;
          const entityId = request.params?.id || response?.id || response?.data?.id;

          await this.activityLogsService.log({
            action: activityOptions.action,
            description: activityOptions.description || `${user?.email || 'Anonymous'} performed ${activityOptions.action}`,
            entityName: activityOptions.entityName,
            entityId: entityId ? entityId.toString() : undefined,
            ipAddress: request.ip || request.headers['x-forwarded-for'],
            userAgent: request.headers['user-agent'],
            payload: {
              params: request.params,
              query: request.query,
              body: request.body,
            },
            userId,
            merchantId,
          });
        } catch (err) {
          console.error('Failed to save activity log in interceptor:', err);
        }
      }),
    );
  }
}
