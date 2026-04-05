import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DbService } from '../db/db.service';
import { User } from './entities/user.entity';
import { UserRole } from 'src/const/const';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  findAll(page?: string, limit?: string, sortBy?: string, order?: string) {
    let data = this.db.users.map((u) => {
      const { ...rest } = u;
      delete rest.password;
      return rest;
    });
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  findOne(id: string) {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { ...rest } = user;
    delete rest.password;
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
    const { ...rest } = newUser;
    delete rest.password;
    return rest;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    if (!updateUserDto.oldPassword || !updateUserDto.newPassword) {
      throw new BadRequestException('Invalid data');
    }
    const user = this.db.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.password !== updateUserDto.oldPassword) {
      throw new ForbiddenException('Old password does not match');
    }
    user.password = updateUserDto.newPassword;
    user.updatedAt = Date.now();

    const { ...rest } = user;
    delete rest.password;
    return rest;
  }

  remove(id: string) {
    const index = this.db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException('User not found');
    }
    this.db.users.splice(index, 1);

    this.db.articles.forEach((article) => {
      if (article.authorId === id) {
        article.authorId = null;
      }
    });

    this.db.comments = this.db.comments.filter((c) => c.authorId !== id);
  }
}
