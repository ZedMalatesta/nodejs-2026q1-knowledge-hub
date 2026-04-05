import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DbService } from '../db/db.service';
import { User } from './entities/user.entity';
import { UserRole } from 'src/const/const';

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) { }

  findAll() {
    return this.db.users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
  }

  findOne(id: string) {
    const user = this.db.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...rest } = user;
    return rest;
  }

  create(createUserDto: CreateUserDto) {
    const now = Date.now();
    const newUser: User = {
      id: uuidv4(),
      login: createUserDto.login,
      password: createUserDto.password,
      role: createUserDto.role || UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };
    this.db.users.push(newUser);
    const { password, ...rest } = newUser;
    return rest;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    if (!updateUserDto.oldPassword || !updateUserDto.newPassword) {
      throw new BadRequestException('Invalid data');
    }
    const user = this.db.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.password !== updateUserDto.oldPassword) {
      throw new ForbiddenException('Old password does not match');
    }
    user.password = updateUserDto.newPassword;
    user.updatedAt = Date.now();

    const { password, ...rest } = user;
    return rest;
  }

  remove(id: string) {
    const index = this.db.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new NotFoundException('User not found');
    }
    this.db.users.splice(index, 1);

    this.db.articles.forEach(article => {
      if (article.authorId === id) {
        article.authorId = null;
      }
    });

    this.db.comments = this.db.comments.filter(c => c.authorId !== id);
  }
}
