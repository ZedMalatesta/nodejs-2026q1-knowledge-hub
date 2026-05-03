import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { AppError, TooManyRequestsError } from '../errors/http.errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}: ${message}`,
      stack ?? 'No stack trace available',
    );

    if (exception instanceof AppError) {
      const { statusCode } = exception;
      if (exception instanceof TooManyRequestsError && exception.retryAfterSec !== undefined) {
        response.setHeader('Retry-After', String(exception.retryAfterSec));
      }
      response.status(statusCode).json({
        statusCode,
        error: STATUS_CODES[statusCode] ?? 'Error',
        message: exception.message,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
}
