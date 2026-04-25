import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from '../../articles/articles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ArticleStatus } from 'src/const/const';

const mockPrisma = {
  article: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  describe('findAll', () => {
    it('should return all articles when no filter is given', async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        { id: 'art-1', title: 'A', content: 'x', status: 'DRAFT', authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date() },
        { id: 'art-2', title: 'B', content: 'y', status: 'DRAFT', authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = (await service.findAll()) as any[];

      expect(result).toHaveLength(2);
    });

    it('should filter by status and pass the Prisma enum value in the where clause', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findAll(ArticleStatus.PUBLISHED);

      const { where } = mockPrisma.article.findMany.mock.calls[0][0];
      expect(where.status).toBe('PUBLISHED');
    });

    it('should filter by categoryId', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findAll(undefined, 'cat-1');

      const { where } = mockPrisma.article.findMany.mock.calls[0][0];
      expect(where.categoryId).toBe('cat-1');
    });

    it('should filter by tag using a nested some query', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findAll(undefined, undefined, 'nestjs');

      const { where } = mockPrisma.article.findMany.mock.calls[0][0];
      expect(where.tags).toEqual({ some: { name: 'nestjs' } });
    });

    it('should return a paginated object when page and limit are provided', async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        { id: 'art-1', title: 'A', content: 'x', status: 'DRAFT', authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = (await service.findAll(undefined, undefined, undefined, '1', '5')) as any;

      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 5);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return the article with lowercase status and tags as a string array', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1', title: 'Title', content: 'Content', status: 'PUBLISHED',
        authorId: 'user-1', categoryId: null,
        tags: [{ name: 'ts' }, { name: 'nest' }],
        createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.findOne('art-1');

      expect(result.status).toBe('published');
      expect(result.tags).toEqual(['ts', 'nest']);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an article and return the mapped result', async () => {
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1', title: 'New Article', content: 'Body', status: 'DRAFT',
        authorId: 'user-1', categoryId: null, tags: [{ name: 'vitest' }],
        createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.create({
        title: 'New Article', content: 'Body',
        status: ArticleStatus.DRAFT, authorId: 'user-1',
      });

      expect(result).toHaveProperty('id', 'art-1');
      expect(result.tags).toEqual(['vitest']);
    });

    it('should default to DRAFT status when none is provided', async () => {
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1', title: 'No Status', content: 'x', status: 'DRAFT',
        authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create({ title: 'No Status', content: 'x' });

      expect(mockPrisma.article.create.mock.calls[0][0].data.status).toBe('DRAFT');
    });

    it('should use connectOrCreate for each tag so existing tags are reused', async () => {
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1', title: 'Tagged', content: 'x', status: 'DRAFT',
        authorId: null, categoryId: null, tags: [{ name: 'a' }, { name: 'b' }],
        createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create({ title: 'Tagged', content: 'x', tags: ['a', 'b'] });

      const { data } = mockPrisma.article.create.mock.calls[0][0];
      expect(data.tags.connectOrCreate).toHaveLength(2);
      expect(data.tags.connectOrCreate[0]).toEqual({ where: { name: 'a' }, create: { name: 'a' } });
    });

    it('should set authorId to null when not provided', async () => {
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1', title: 'Anon', content: 'x', status: 'DRAFT',
        authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create({ title: 'Anon', content: 'x' });

      expect(mockPrisma.article.create.mock.calls[0][0].data.authorId).toBeNull();
    });
  });

  describe('update', () => {
    it('should transition status from draft to published', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', status: 'DRAFT' });
      mockPrisma.article.update.mockResolvedValue({
        id: 'art-1', title: 'Title', content: 'x', status: 'PUBLISHED',
        authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.update('art-1', { status: ArticleStatus.PUBLISHED });

      expect(result.status).toBe('published');
      expect(mockPrisma.article.update.mock.calls[0][0].data.status).toBe('PUBLISHED');
    });

    it('should transition status from published to archived', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', status: 'PUBLISHED' });
      mockPrisma.article.update.mockResolvedValue({
        id: 'art-1', title: 'Title', content: 'x', status: 'ARCHIVED',
        authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.update('art-1', { status: ArticleStatus.ARCHIVED });

      expect(result.status).toBe('archived');
    });

    it('should pass undefined to Prisma when an invalid status is provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      mockPrisma.article.update.mockResolvedValue({
        id: 'art-1', title: 'Title', content: 'x', status: 'DRAFT',
        authorId: null, categoryId: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
      });

      await service.update('art-1', { status: 'INVALID' as ArticleStatus });

      expect(mockPrisma.article.update.mock.calls[0][0].data.status).toBeUndefined();
    });

    it('should replace the full tag list on update', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      mockPrisma.article.update.mockResolvedValue({
        id: 'art-1', title: 'Title', content: 'x', status: 'DRAFT',
        authorId: null, categoryId: null, tags: [{ name: 'new' }], createdAt: new Date(), updatedAt: new Date(),
      });

      await service.update('art-1', { tags: ['new'] });

      const { data } = mockPrisma.article.update.mock.calls[0][0];
      expect(data.tags.set).toEqual([]);
      expect(data.tags.connectOrCreate[0]).toEqual({ where: { name: 'new' }, create: { name: 'new' } });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the article when it exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      mockPrisma.article.delete.mockResolvedValue(undefined);

      await expect(service.remove('art-1')).resolves.toBeUndefined();
      expect(mockPrisma.article.delete).toHaveBeenCalledWith({ where: { id: 'art-1' } });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
