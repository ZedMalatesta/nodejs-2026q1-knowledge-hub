import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly blacklistedTokens = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { login, password } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { login },
    });

    if (existingUser) {
      throw new BadRequestException('Login is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: Role.viewer,
      },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async login(loginDto: LoginDto) {
    const { login, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { login },
    });

    if (!user) {
      throw new ForbiddenException('Authentication failed');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ForbiddenException('Authentication failed');
    }

    const payload = { userId: user.id, login: user.login, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshDto: RefreshDto) {
    if (this.blacklistedTokens.has(refreshDto.refreshToken)) {
      throw new ForbiddenException('Authentication failed');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new ForbiddenException('Authentication failed');
      }

      const newPayload = { userId: user.id, login: user.login, role: user.role };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL as any,
      });

      const refreshToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL as any,
      });

      return {
        accessToken,
        refreshToken,
      };
    } catch (e) {
      throw new ForbiddenException('Authentication failed');
    }
  }

  async logout(refreshDto: RefreshDto) {
    this.blacklistedTokens.add(refreshDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  async adminCreate(signupDto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: signupDto.login },
    });

    if (existing) {
      if (existing.role === Role.admin) {
        return { id: existing.id, login: existing.login, role: existing.role };
      }
      throw new BadRequestException('Login already taken');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        login: signupDto.login,
        password: hashedPassword,
        role: Role.admin,
      },
    });

    return { id: user.id, login: user.login, role: 'admin' };
  }
}
