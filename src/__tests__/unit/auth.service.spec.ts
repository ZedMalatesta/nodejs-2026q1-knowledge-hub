import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_pw'),
  compare: vi.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: JwtService,
          useValue: { signAsync: vi.fn(), verifyAsync: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('signup throws BadRequestException when login is already taken', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.signup({ login: 'alice', password: 'secret' }),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
