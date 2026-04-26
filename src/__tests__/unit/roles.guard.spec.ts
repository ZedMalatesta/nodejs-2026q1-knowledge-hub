import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenError } from '../../errors/http.errors';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

const mockPrisma = {
  article: { findUnique: vi.fn() },
  comment: { findUnique: vi.fn() },
};

function makeContext(
  overrides: {
    role?: string;
    method?: string;
    path?: string;
    params?: Record<string, string>;
    isPublic?: boolean;
    user?: any;
  } = {},
) {
  mockReflector.getAllAndOverride.mockReturnValue(overrides.isPublic ?? false);

  const user =
    overrides.user !== undefined
      ? overrides.user
      : overrides.role
        ? { userId: 'u1', role: overrides.role }
        : undefined;

  const request = {
    user,
    method: overrides.method ?? 'GET',
    route: { path: overrides.path ?? '/article' },
    params: overrides.params ?? {},
  };

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  describe('@Public() routes', () => {
    it('should allow access without a user when route is marked @Public()', async () => {
      const ctx = makeContext({ isPublic: true, user: null });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('missing user', () => {
    it('should return false when there is no user on the request', async () => {
      const ctx = makeContext({ user: null });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });

  describe('admin', () => {
    it('should allow any GET request', async () => {
      const ctx = makeContext({
        role: 'admin',
        method: 'GET',
        path: '/article',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should allow any POST request', async () => {
      const ctx = makeContext({ role: 'admin', method: 'POST', path: '/user' });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should allow any DELETE request', async () => {
      const ctx = makeContext({
        role: 'admin',
        method: 'DELETE',
        path: '/category/1',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('viewer', () => {
    it('should allow GET requests', async () => {
      const ctx = makeContext({
        role: 'viewer',
        method: 'GET',
        path: '/article',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenError on POST requests', async () => {
      const ctx = makeContext({
        role: 'viewer',
        method: 'POST',
        path: '/article',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError on DELETE requests', async () => {
      const ctx = makeContext({
        role: 'viewer',
        method: 'DELETE',
        path: '/article',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('editor', () => {
    it('should allow GET requests', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'GET',
        path: '/article',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should allow POST to /article', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'POST',
        path: '/article',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should allow POST to /comment', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'POST',
        path: '/comment',
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenError on POST to /category', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'POST',
        path: '/category',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError on POST to /user', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'POST',
        path: '/user',
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should allow DELETE on own article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        authorId: 'u1',
      });
      const ctx = makeContext({
        role: 'editor',
        method: 'DELETE',
        path: '/article',
        params: { id: 'art-1' },
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it("should throw ForbiddenError on DELETE of another editor's article", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-2',
        authorId: 'other',
      });
      const ctx = makeContext({
        role: 'editor',
        method: 'DELETE',
        path: '/article',
        params: { id: 'art-2' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should allow PUT on own comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'c-1',
        authorId: 'u1',
      });
      const ctx = makeContext({
        role: 'editor',
        method: 'PUT',
        path: '/comment',
        params: { id: 'c-1' },
      });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it("should throw ForbiddenError on PUT of another editor's comment", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'c-2',
        authorId: 'other',
      });
      const ctx = makeContext({
        role: 'editor',
        method: 'PUT',
        path: '/comment',
        params: { id: 'c-2' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should return false on PUT/DELETE when no id param is present', async () => {
      const ctx = makeContext({
        role: 'editor',
        method: 'DELETE',
        path: '/article',
        params: {},
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });
});
