import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { DbService } from '../db/db.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

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
      role: createUserDto.role || 'viewer',
      createdAt: now,
      updatedAt: now,
    };
    this.db.users.push(newUser);
    const { password, ...rest } = newUser;
    return rest;
  }
}
