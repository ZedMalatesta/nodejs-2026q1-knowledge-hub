import { describe, it, expect, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../../filters/http-exception.filter';

function makeHost(url = '/test') {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url };

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    _json: json,
    _status: status,
  } as any;
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('should respond with 400 for BadRequestException', () => {
    const host = makeHost('/users');
    filter.catch(new BadRequestException('invalid body'), host);

    expect(host._status).toHaveBeenCalledWith(400);
    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('should respond with 401 for UnauthorizedException', () => {
    const host = makeHost();
    filter.catch(new UnauthorizedException('Missing token'), host);

    expect(host._status).toHaveBeenCalledWith(401);
    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Missing token' }),
    );
  });

  it('should respond with 403 for ForbiddenException', () => {
    const host = makeHost();
    filter.catch(new ForbiddenException('Viewers have read-only access'), host);

    expect(host._status).toHaveBeenCalledWith(403);
    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Viewers have read-only access',
      }),
    );
  });

  it('should respond with 404 for NotFoundException', () => {
    const host = makeHost('/article/missing');
    filter.catch(new NotFoundException('Article not found'), host);

    expect(host._status).toHaveBeenCalledWith(404);
    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Article not found',
      }),
    );
  });

  it('should include the request path in the response body', () => {
    const host = makeHost('/article/123');
    filter.catch(new NotFoundException(), host);

    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/article/123' }),
    );
  });

  it('should include the exception name as the error field', () => {
    const host = makeHost();
    filter.catch(new ForbiddenException(), host);

    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ForbiddenException' }),
    );
  });

  it('should handle a generic HttpException with a custom status', () => {
    const host = makeHost();
    filter.catch(new HttpException('Too Many Requests', 429), host);

    expect(host._status).toHaveBeenCalledWith(429);
    expect(host._json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        message: 'Too Many Requests',
      }),
    );
  });
});
