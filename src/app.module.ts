import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    ArticlesModule,
    CategoriesModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
