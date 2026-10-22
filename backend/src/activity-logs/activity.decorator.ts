import { SetMetadata } from '@nestjs/common';

export interface ActivityOptions {
  action: string;
  description?: string;
  entityName?: string;
}

export const LOG_ACTIVITY_KEY = 'log_activity';
export const LogActivity = (options: string | ActivityOptions) => {
  const metaOptions = typeof options === 'string' ? { action: options } : options;
  return SetMetadata(LOG_ACTIVITY_KEY, metaOptions);
};
