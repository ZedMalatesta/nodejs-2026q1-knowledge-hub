import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { StripPasswordInterceptor } from '../../interceptors/strip-password.interceptor';

function makeHandler(value: any) {
  return { handle: () => of(value) };
}

const ctx = {} as any;
const interceptor = new StripPasswordInterceptor();

function run(value: any): Promise<any> {
  return new Promise((resolve) => {
    interceptor.intercept(ctx, makeHandler(value)).subscribe(resolve);
  });
}

describe('StripPasswordInterceptor', () => {
  it('should remove the password field from a single user object', async () => {
    const result = await run({ id: 'u1', login: 'alice', password: 'secret', role: 'viewer' });

    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('login', 'alice');
  });

  it('should remove the password field from every item in an array response', async () => {
    const result = await run([
      { id: 'u1', login: 'alice', password: 'secret', role: 'viewer' },
      { id: 'u2', login: 'bob', password: 'hidden', role: 'editor' },
    ]);

    expect(result.every((u: any) => !('password' in u))).toBe(true);
  });

  it('should remove password from the data array inside a paginated response', async () => {
    const result = await run({
      total: 1,
      page: 1,
      limit: 10,
      data: [{ id: 'u1', login: 'alice', password: 'secret', role: 'viewer' }],
    });

    expect(result.data[0]).not.toHaveProperty('password');
    expect(result).toHaveProperty('total', 1);
  });

  it('should pass through a response with no password field unchanged', async () => {
    const result = await run({ id: 'art-1', title: 'Hello', status: 'draft' });

    expect(result).toEqual({ id: 'art-1', title: 'Hello', status: 'draft' });
  });

  it('should pass through null without throwing', async () => {
    const result = await run(null);

    expect(result).toBeNull();
  });

  it('should pass through a plain string without throwing', async () => {
    const result = await run('ok');

    expect(result).toBe('ok');
  });
});
