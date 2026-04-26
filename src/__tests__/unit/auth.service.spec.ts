import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenError, ValidationError } from '../../errors/http.errors';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const mockJwt = {
  signAsync: vi.fn(),
  verifyAsync: vi.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('should hash the password before saving', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash as any).mockResolvedValue('hashed_pw');
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed_pw',
        role: Role.viewer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.signup({ login: 'alice', password: 'plaintext' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
    });

    it('should return user data without the password field', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash as any).mockResolvedValue('hashed_pw');
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed_pw',
        role: Role.viewer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.signup({
        login: 'alice',
        password: 'plaintext',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 'uuid-1');
      expect(result).toHaveProperty('login', 'alice');
    });

    it('should assign viewer role by default', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash as any).mockResolvedValue('hashed_pw');
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed_pw',
        role: Role.viewer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.signup({ login: 'alice', password: 'pass' });

      const createArg = mockPrisma.user.create.mock.calls[0][0];
      expect(createArg.data.role).toBe(Role.viewer);
    });

    it('should throw ValidationError when login is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.signup({ login: 'alice', password: 'secret' }),
      ).rejects.toThrow(ValidationError);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed',
        role: Role.editor,
      });
      vi.mocked(bcrypt.compare as any).mockResolvedValue(true);
      mockJwt.signAsync
        .mockResolvedValueOnce('access_tok')
        .mockResolvedValueOnce('refresh_tok');

      const result = await service.login({ login: 'alice', password: 'pass' });

      expect(result).toHaveProperty('accessToken', 'access_tok');
      expect(result).toHaveProperty('refreshToken', 'refresh_tok');
    });

    it('should include userId, login and role in the JWT payload', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed',
        role: Role.editor,
      });
      vi.mocked(bcrypt.compare as any).mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValue('tok');

      await service.login({ login: 'alice', password: 'pass' });

      const [payload] = mockJwt.signAsync.mock.calls[0];
      expect(payload).toHaveProperty('userId', 'uuid-1');
      expect(payload).toHaveProperty('login', 'alice');
      expect(payload).toHaveProperty('role', Role.editor);
    });

    it('should throw ForbiddenError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ login: 'nobody', password: 'pass' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        login: 'alice',
        password: 'hashed',
      });
      vi.mocked(bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        service.login({ login: 'alice', password: 'wrong' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('refresh', () => {
    it('should return a new token pair for a valid refresh token', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        userId: 'u1',
        login: 'alice',
        role: 'editor',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        role: Role.editor,
      });
      mockJwt.signAsync
        .mockResolvedValueOnce('new_access')
        .mockResolvedValueOnce('new_refresh');

      const result = await service.refresh({ refreshToken: 'valid_tok' });

      expect(result).toHaveProperty('accessToken', 'new_access');
      expect(result).toHaveProperty('refreshToken', 'new_refresh');
    });

    it('should verify using the refresh token secret', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        role: Role.viewer,
      });
      mockJwt.signAsync.mockResolvedValue('tok');

      await service.refresh({ refreshToken: 'rt' });

      const [, opts] = mockJwt.verifyAsync.mock.calls[0];
      expect(opts.secret).toBe(process.env.JWT_REFRESH_SECRET);
    });

    it('should throw ForbiddenError when the JWT signature is invalid', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(
        service.refresh({ refreshToken: 'tampered' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when the token is expired', async () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      mockJwt.verifyAsync.mockRejectedValue(err);

      await expect(
        service.refresh({ refreshToken: 'expired' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when the user was deleted after the token was issued', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ userId: 'deleted' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'valid' })).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('logout', () => {
    it('should return a success message', async () => {
      const result = await service.logout({ refreshToken: 'tok' });

      expect(result).toHaveProperty('message', 'Logged out successfully');
    });

    it('should blacklist the token so refresh is rejected without verifying', async () => {
      await service.logout({ refreshToken: 'used_tok' });

      await expect(
        service.refresh({ refreshToken: 'used_tok' }),
      ).rejects.toThrow(ForbiddenError);
      expect(mockJwt.verifyAsync).not.toHaveBeenCalled();
    });

    it('should not affect other active tokens when one is blacklisted', async () => {
      await service.logout({ refreshToken: 'tok_a' });

      mockJwt.verifyAsync.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        role: Role.viewer,
      });
      mockJwt.signAsync.mockResolvedValue('new_tok');

      await service.refresh({ refreshToken: 'tok_b' });

      expect(mockJwt.verifyAsync).toHaveBeenCalledOnce();
    });
  });

  describe('adminCreate', () => {
    it('should create a new user with admin role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash as any).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({
        id: 'u2',
        login: 'admin',
        role: Role.admin,
      });

      const result = await service.adminCreate({
        login: 'admin',
        password: 'secret',
      });

      expect(result).toHaveProperty('role', 'admin');
      expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe(
        Role.admin,
      );
    });

    it('should return the existing admin without recreating when login already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'admin',
        role: Role.admin,
      });

      const result = await service.adminCreate({
        login: 'admin',
        password: 'any',
      });

      expect(result).toHaveProperty('login', 'admin');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when login belongs to a non-admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u3',
        role: Role.editor,
      });

      await expect(
        service.adminCreate({ login: 'editor', password: 'pass' }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
