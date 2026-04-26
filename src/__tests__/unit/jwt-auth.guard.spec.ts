import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedError } from '../../errors/http.errors';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

const mockJwt = {
  verifyAsync: vi.fn(),
};

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

function makeContext(
  overrides: {
    authorization?: string;
    isPublic?: boolean;
  } = {},
) {
  mockReflector.getAllAndOverride.mockReturnValue(overrides.isPublic ?? false);

  const request = {
    headers: { authorization: overrides.authorization },
    user: undefined as any,
    route: { path: '/test' },
  };

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
    _request: request,
  } as any;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwt },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should allow access when route is marked @Public()', async () => {
    const ctx = makeContext({ isPublic: true });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockJwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('should attach the decoded payload to request.user on a valid token', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      userId: 'u1',
      login: 'alice',
      role: 'viewer',
    });
    const ctx = makeContext({ authorization: 'Bearer valid_token' });

    await guard.canActivate(ctx);

    expect(ctx._request.user).toEqual({
      userId: 'u1',
      login: 'alice',
      role: 'viewer',
    });
  });

  it('should throw UnauthorizedError when Authorization header is missing', async () => {
    const ctx = makeContext();

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    expect(mockJwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when the scheme is not Bearer', async () => {
    const ctx = makeContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when the token is malformed', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const ctx = makeContext({ authorization: 'Bearer bad.token.here' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when the token is expired', async () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    mockJwt.verifyAsync.mockRejectedValue(err);
    const ctx = makeContext({ authorization: 'Bearer expired_token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
  });

  it('should verify using the JWT_SECRET env variable', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ userId: 'u1' });
    const ctx = makeContext({ authorization: 'Bearer tok' });

    await guard.canActivate(ctx);

    const [, opts] = mockJwt.verifyAsync.mock.calls[0];
    expect(opts.secret).toBe(process.env.JWT_SECRET);
  });
});
