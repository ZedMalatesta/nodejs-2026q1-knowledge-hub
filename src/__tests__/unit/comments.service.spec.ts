import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommentsService } from '../../comments/comments.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  comment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  article: {
    findUnique: vi.fn(),
  },
};

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('findAll', () => {
    it('should return all comments for the given articleId', async () => {
      const createdAt = new Date();
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: 'cm1', content: 'Nice', articleId: 'art-1', authorId: null, createdAt },
        { id: 'cm2', content: 'Thanks', articleId: 'art-1', authorId: 'u1', createdAt },
      ]);

      const result = (await service.findAll('art-1')) as any[];

      expect(result).toHaveLength(2);
      expect(mockPrisma.comment.findMany.mock.calls[0][0].where.articleId).toBe('art-1');
    });

    it('should map createdAt to a unix timestamp', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: 'cm1', content: 'Nice', articleId: 'art-1', authorId: null, createdAt },
      ]);

      const result = (await service.findAll('art-1')) as any[];

      expect(result[0].createdAt).toBe(createdAt.getTime());
    });

    it('should return a paginated object when page and limit are provided', async () => {
      const createdAt = new Date();
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: 'cm1', content: 'Nice', articleId: 'art-1', authorId: null, createdAt },
      ]);

      const result = (await service.findAll('art-1', '1', '5')) as any;

      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return the mapped comment when it exists', async () => {
      const createdAt = new Date('2024-06-01T12:00:00.000Z');
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'cm1', content: 'Hello', articleId: 'art-1', authorId: 'u1', createdAt,
      });

      const result = await service.findOne('cm1');

      expect(result).toHaveProperty('id', 'cm1');
      expect(result).toHaveProperty('content', 'Hello');
      expect(result).toHaveProperty('createdAt', createdAt.getTime());
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return the mapped comment', async () => {
      const createdAt = new Date();
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      mockPrisma.comment.create.mockResolvedValue({
        id: 'cm1', content: 'Great post!', articleId: 'art-1', authorId: 'u1', createdAt,
      });

      const result = await service.create({
        content: 'Great post!',
        articleId: 'art-1',
        authorId: 'u1',
      });

      expect(result).toHaveProperty('id', 'cm1');
      expect(result).toHaveProperty('content', 'Great post!');
    });

    it('should set authorId to null when not provided', async () => {
      const createdAt = new Date();
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      mockPrisma.comment.create.mockResolvedValue({
        id: 'cm1', content: 'Anon', articleId: 'art-1', authorId: null, createdAt,
      });

      await service.create({ content: 'Anon', articleId: 'art-1' });

      expect(mockPrisma.comment.create.mock.calls[0][0].data.authorId).toBeNull();
    });

    it('should throw UnprocessableEntityException when the article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ content: 'x', articleId: 'missing-art' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the comment when it exists', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: 'cm1' });
      mockPrisma.comment.delete.mockResolvedValue(undefined);

      await expect(service.remove('cm1')).resolves.toBeUndefined();
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'cm1' } });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.comment.delete).not.toHaveBeenCalled();
    });
  });
});
