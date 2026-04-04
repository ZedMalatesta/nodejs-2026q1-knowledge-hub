export class User {
  id: string;
  login: string;
  password?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: number;
  updatedAt: number;
}
