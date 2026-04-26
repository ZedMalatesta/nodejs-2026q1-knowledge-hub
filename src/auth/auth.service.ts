import { Injectable, Logger } from '@nestjs/common';
import { ForbiddenError, ValidationError } from '../errors/http.errors';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
      this.logger.warn(`Signup failed: login already taken`);
      throw new ValidationError('Login is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: Role.viewer,
      },
    });

    this.logger.log(`User signed up: id=${user.id}`);
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
      this.logger.warn(`Login failed: user not found`);
      throw new ForbiddenError('Authentication failed');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: invalid password for user id=${user.id}`);
      throw new ForbiddenError('Authentication failed');
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

    this.logger.log(`User logged in: id=${user.id}`);
    return { accessToken, refreshToken };
  }

  async refresh(refreshDto: RefreshDto) {
    if (this.blacklistedTokens.has(refreshDto.refreshToken)) {
      this.logger.warn('Token refresh rejected: token is blacklisted');
      throw new ForbiddenError('Authentication failed');
    }

    try {
      const payload = await this.jwtService.verifyAsync(
        refreshDto.refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        this.logger.warn(
          `Token refresh failed: user id=${payload.userId} not found`,
        );
        throw new ForbiddenError('Authentication failed');
      }

      const newPayload = {
        userId: user.id,
        login: user.login,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL as any,
      });

      const refreshToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL as any,
      });

      this.logger.debug(`Tokens refreshed for user id=${user.id}`);
      return { accessToken, refreshToken };
    } catch (e) {
      if (e instanceof ForbiddenError) throw e;
      this.logger.warn(`Token refresh failed: ${(e as Error).message}`);
      throw new ForbiddenError('Authentication failed');
    }
  }

  async logout(refreshDto: RefreshDto) {
    this.blacklistedTokens.add(refreshDto.refreshToken);
    this.logger.debug('Token blacklisted on logout');
    return { message: 'Logged out successfully' };
  }

  async adminCreate(signupDto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: signupDto.login },
    });

    if (existing) {
      if (existing.role === Role.admin) {
        this.logger.debug(`Admin already exists: id=${existing.id}`);
        return { id: existing.id, login: existing.login, role: existing.role };
      }
      this.logger.warn(
        `Admin creation failed: login already taken by non-admin`,
      );
      throw new ValidationError('Login already taken');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        login: signupDto.login,
        password: hashedPassword,
        role: Role.admin,
      },
    });

    this.logger.log(`Admin user created: id=${user.id}`);
    return { id: user.id, login: user.login, role: 'admin' };
  }
}
