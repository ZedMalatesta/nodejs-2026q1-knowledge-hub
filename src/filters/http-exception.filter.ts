import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as any).message ?? exception.message);

    const logMsg = `${request.method} ${request.url} ${status} - ${message}`;
    if (status >= 500) {
      this.logger.error(logMsg, exception.stack);
    } else {
      this.logger.warn(logMsg);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
      path: request.url,
    });
  }
}
