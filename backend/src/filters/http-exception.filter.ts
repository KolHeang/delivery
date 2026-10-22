import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Extract the message — could be a string or NestJS validation array
    let message: string | string[];
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      message = (exceptionResponse as any).message ?? 'An error occurred';
    } else {
      message = 'Internal server error';
    }

    this.logger.error(
      `${request.method} ${request.url} → ${httpStatus}: ${JSON.stringify(message)}`,
    );

    // ✅ បន្ថែមបន្ទាត់នេះ
    if (!(exception instanceof HttpException)) {
      this.logger.error('FULL ERROR:', (exception as any)?.stack ?? exception);
    }

    // Same shape as success but status: false
    response.status(httpStatus).json({
      status: false,
      message,
      data: null,
    });
  }
}
