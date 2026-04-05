import { UserRole } from 'src/const/const';

export class User {
  id: string;
  login: string;
  password?: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}
