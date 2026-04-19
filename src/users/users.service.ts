import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'src/const/const';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: any) {
    const { password, ...rest } = user;
    return {
      ...rest,
      role: user.role.toLowerCase(),
      createdAt: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.getTime() : user.updatedAt,
    };
  }

  async findAll(page?: string, limit?: string, sortBy?: string, order?: string) {
    const users = await this.prisma.user.findMany();
    let data = users.map((u) => this.mapUser(u));
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
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
    return this.mapUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (!updateUserDto.oldPassword || !updateUserDto.newPassword) {
      throw new BadRequestException('Invalid data');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.password !== updateUserDto.oldPassword) {
      throw new ForbiddenException('Old password does not match');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: updateUserDto.newPassword,
      },
    });

    return this.mapUser(updatedUser);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction: set articles' authorId to null, delete comments, then delete user
    await this.prisma.$transaction(async (tx) => {
      // Set authorId to null on articles (SetNull is handled by schema, but explicit for transaction)
      await tx.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });

      // Delete user's comments (Cascade is handled by schema)
      await tx.comment.deleteMany({
        where: { authorId: id },
      });

      // Delete user
      await tx.user.delete({
        where: { id },
      });
    });
  }

  private mapRoleToPrisma(role: UserRole): any {
    const roleMap: Record<string, string> = {
      [UserRole.ADMIN]: 'ADMIN',
      [UserRole.EDITOR]: 'EDITOR',
      [UserRole.VIEWER]: 'VIEWER',
    };
    return roleMap[role] || 'VIEWER';
  }
}
