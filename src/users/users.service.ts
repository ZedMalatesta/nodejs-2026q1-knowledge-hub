import { Injectable, Logger } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/http.errors';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'src/const/const';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: any) {
    const rest = { ...user };
    delete rest.password;
    return {
      ...rest,
      role: user.role,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.getTime()
          : user.createdAt,
      updatedAt:
        user.updatedAt instanceof Date
          ? user.updatedAt.getTime()
          : user.updatedAt,
    };
  }

  async findAll(
    page?: string,
    limit?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.logger.debug('Fetching all users');
    const users = await this.prisma.user.findMany();
    let data = users.map((u) => this.mapUser(u));
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching user id=${id}`);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      this.logger.warn(`User not found: id=${id}`);
      throw new NotFoundError('User not found');
    }
    return this.mapUser(user);
  }

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        login: createUserDto.login,
        password: createUserDto.password,
        role: this.mapRoleToPrisma(createUserDto.role || UserRole.VIEWER),
      },
    });
    this.logger.log(`User created: id=${user.id}`);
    return this.mapUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const hasPasswordUpdate =
      updateUserDto.oldPassword && updateUserDto.newPassword;
    const hasRoleUpdate = updateUserDto.role !== undefined;

    if (!hasPasswordUpdate && !hasRoleUpdate) {
      throw new ValidationError('Invalid data');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      this.logger.warn(`User not found for update: id=${id}`);
      throw new NotFoundError('User not found');
    }

    const data: Record<string, any> = {};

    if (hasPasswordUpdate) {
      if (user.password !== updateUserDto.oldPassword) {
        throw new ForbiddenError('Old password does not match');
      }
      data.password = updateUserDto.newPassword;
    }

    if (hasRoleUpdate) {
      data.role = this.mapRoleToPrisma(updateUserDto.role);
    }

    const updatedUser = await this.prisma.user.update({ where: { id }, data });
    this.logger.log(`User updated: id=${id}`);
    return this.mapUser(updatedUser);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      this.logger.warn(`User not found for deletion: id=${id}`);
      throw new NotFoundError('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });
      await tx.comment.deleteMany({ where: { authorId: id } });
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`User deleted: id=${id}`);
  }

  private mapRoleToPrisma(role: UserRole): any {
    return role || UserRole.VIEWER;
  }
}
