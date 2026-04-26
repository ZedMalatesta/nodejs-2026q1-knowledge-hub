import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../../errors/http.errors';

describe('Custom HTTP error classes', () => {
  it('NotFoundError has statusCode 404 and default message', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('NotFoundError');
  });

  it('NotFoundError accepts a custom message', () => {
    expect(new NotFoundError('Article not found').message).toBe(
      'Article not found',
    );
  });

  it('ValidationError has statusCode 400 and default message', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
    expect(err.name).toBe('ValidationError');
  });

  it('ValidationError accepts a custom message', () => {
    expect(new ValidationError('email is required').message).toBe(
      'email is required',
    );
  });

  it('UnauthorizedError has statusCode 401 and default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
    expect(err.name).toBe('UnauthorizedError');
  });

  it('UnauthorizedError accepts a custom message', () => {
    expect(new UnauthorizedError('Token expired').message).toBe(
      'Token expired',
    );
  });

  it('ForbiddenError has statusCode 403 and default message', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
    expect(err.name).toBe('ForbiddenError');
  });

  it('ForbiddenError accepts a custom message', () => {
    expect(new ForbiddenError('Insufficient permissions').message).toBe(
      'Insufficient permissions',
    );
  });

  it('all custom errors are instanceof AppError and Error', () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ValidationError()).toBeInstanceOf(AppError);
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
  });
});
