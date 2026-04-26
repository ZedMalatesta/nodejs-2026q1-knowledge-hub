import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../errors/http.errors';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from 'src/const/const';

const mockTx = {
  article: { updateMany: vi.fn() },
  comment: { deleteMany: vi.fn() },
  user: { delete: vi.fn() },
};

const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: any) => Promise<any>) => fn(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('should strip the password from every returned user', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          login: 'alice',
          password: 'secret',
          role: 'viewer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'u2',
          login: 'bob',
          password: 'secret',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = (await service.findAll()) as any[];

      expect(result.every((u) => !('password' in u))).toBe(true);
    });

    it('should return a paginated object when page and limit are provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          login: 'alice',
          password: 'secret',
          role: 'viewer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = (await service.findAll('1', '10')) as any;

      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return the user without the password field', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'secret',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findOne('u1');

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('login', 'alice');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a user with the explicitly provided role', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        login: 'bob',
        password: 'pass',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({
        login: 'bob',
        password: 'pass',
        role: UserRole.EDITOR,
      });

      expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe(
        UserRole.EDITOR,
      );
    });

    it('should assign viewer role when no role is provided', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        login: 'carol',
        password: 'pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({ login: 'carol', password: 'pass' });

      expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe(
        UserRole.VIEWER,
      );
    });
  });

  describe('update', () => {
    it('should change the password when oldPassword matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'old_pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'new_pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update('u1', {
        oldPassword: 'old_pass',
        newPassword: 'new_pass',
      });

      expect(mockPrisma.user.update.mock.calls[0][0].data.password).toBe(
        'new_pass',
      );
    });

    it('should change the role without requiring a password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'pass',
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update('u1', { role: UserRole.EDITOR });

      expect(mockPrisma.user.update.mock.calls[0][0].data.role).toBe(
        UserRole.EDITOR,
      );
    });

    it('should throw ForbiddenError when oldPassword does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'real_pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.update('u1', { oldPassword: 'wrong', newPassword: 'new_pass' }),
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when neither password nor role is supplied', async () => {
      await expect(service.update('u1', {})).rejects.toThrow(ValidationError);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('should nullify article authorIds, delete comments, then delete the user inside a transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        login: 'alice',
        password: 'pass',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.remove('u1');

      expect(mockTx.article.updateMany).toHaveBeenCalledWith({
        where: { authorId: 'u1' },
        data: { authorId: null },
      });
      expect(mockTx.comment.deleteMany).toHaveBeenCalledWith({
        where: { authorId: 'u1' },
      });
      expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundError);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
