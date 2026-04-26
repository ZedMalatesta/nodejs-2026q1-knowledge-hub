import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundError } from '../../errors/http.errors';
import { CategoriesService } from '../../categories/categories.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('should return all categories when no pagination is given', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Tech', description: 'Technology' },
        { id: 'c2', name: 'Science', description: 'Science articles' },
      ]);

      const result = (await service.findAll()) as any[];

      expect(result).toHaveLength(2);
    });

    it('should return a paginated object when page and limit are provided', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Tech', description: 'Technology' },
      ]);

      const result = (await service.findAll('1', '10')) as any;

      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return the category when it exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Tech',
        description: 'Technology',
      });

      const result = await service.findOne('c1');

      expect(result).toHaveProperty('id', 'c1');
      expect(result).toHaveProperty('name', 'Tech');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create and return the new category', async () => {
      mockPrisma.category.create.mockResolvedValue({
        id: 'c1',
        name: 'Tech',
        description: 'Technology',
      });

      const result = await service.create({
        name: 'Tech',
        description: 'Technology',
      });

      expect(result).toHaveProperty('id', 'c1');
      expect(mockPrisma.category.create.mock.calls[0][0].data).toEqual({
        name: 'Tech',
        description: 'Technology',
      });
    });
  });

  describe('update', () => {
    it('should update and return the category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Tech',
        description: 'Old',
      });
      mockPrisma.category.update.mockResolvedValue({
        id: 'c1',
        name: 'Tech',
        description: 'New',
      });

      const result = await service.update('c1', { description: 'New' });

      expect(result).toHaveProperty('description', 'New');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(
        NotFoundError,
      );
      expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the category when it exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.category.delete.mockResolvedValue(undefined);

      await expect(service.remove('c1')).resolves.toBeUndefined();
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });

    it('should throw NotFoundError when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundError);
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
