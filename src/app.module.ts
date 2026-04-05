import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [DbModule, UsersModule, ArticlesModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
