import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenError } from '../errors/http.errors';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const role = user.role;
    const method = request.method;
    const path = request.route.path;

    if (role === 'admin') {
      return true;
    }

    if (role === 'viewer') {
      if (method === 'GET') {
        return true;
      }
      throw new ForbiddenError('Viewers have read-only access');
    }

    if (role === 'editor') {
      if (method === 'GET') {
        return true;
      }

      if (path.startsWith('/category') || path.startsWith('/user')) {
        throw new ForbiddenError('Editors cannot manage categories or users');
      }

      if (
        method === 'POST' &&
        (path.startsWith('/article') || path.startsWith('/comment'))
      ) {
        return true;
      }

      if (method === 'PUT' || method === 'DELETE') {
        const id = request.params.id;
        if (!id) return false;

        if (path.startsWith('/article')) {
          const article = await this.prisma.article.findUnique({
            where: { id },
          });
          if (!article || article.authorId !== user.userId) {
            throw new ForbiddenError(
              'Editors can only modify their own articles',
            );
          }
          return true;
        }

        if (path.startsWith('/comment')) {
          const comment = await this.prisma.comment.findUnique({
            where: { id },
          });
          if (!comment || comment.authorId !== user.userId) {
            throw new ForbiddenError(
              'Editors can only modify their own comments',
            );
          }
          return true;
        }
      }
    }

    throw new ForbiddenError('Operation not permitted');
  }
}
