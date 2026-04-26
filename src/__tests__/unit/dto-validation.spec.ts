import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateArticleDto } from '../../articles/dto/create-article.dto';
import { UpdateArticleDto } from '../../articles/dto/update-article.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshDto } from '../../auth/dto/refresh.dto';
import { SignupDto } from '../../auth/dto/signup.dto';
import { CreateCategoryDto } from '../../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../categories/dto/update-category.dto';
import { CreateCommentDto } from '../../comments/dto/create-comment.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { ArticleStatus, UserRole } from 'src/const/const';

describe('CreateArticleDto', () => {
  it('should pass with required fields only', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'Hello',
      content: 'World',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when title is missing', async () => {
    const dto = plainToInstance(CreateArticleDto, { content: 'x' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('title');
  });

  it('should fail when content is missing', async () => {
    const dto = plainToInstance(CreateArticleDto, { title: 'x' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('content');
  });

  it('should fail when title is an empty string', async () => {
    const dto = plainToInstance(CreateArticleDto, { title: '', content: 'x' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when status is not a valid ArticleStatus', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'x',
      content: 'x',
      status: 'INVALID',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('should pass when status is a valid ArticleStatus value', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'x',
      content: 'x',
      status: ArticleStatus.PUBLISHED,
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when authorId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'x',
      content: 'x',
      authorId: 'not-a-uuid',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('authorId');
  });

  it('should fail when tags contains a non-string element', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'x',
      content: 'x',
      tags: [1, 2],
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass when tags is an array of strings', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'x',
      content: 'x',
      tags: ['nestjs', 'vitest'],
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

describe('UpdateArticleDto', () => {
  it('should pass with an empty object since all fields are optional', async () => {
    const dto = plainToInstance(UpdateArticleDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when status is not a valid ArticleStatus', async () => {
    const dto = plainToInstance(UpdateArticleDto, { status: 'WRONG' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('should pass with a valid partial payload', async () => {
    const dto = plainToInstance(UpdateArticleDto, { title: 'Updated title' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

describe('LoginDto', () => {
  it('should pass with login and password', async () => {
    const dto = plainToInstance(LoginDto, {
      login: 'alice',
      password: 'secret',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when login is missing', async () => {
    const dto = plainToInstance(LoginDto, { password: 'secret' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('login');
  });

  it('should fail when password is missing', async () => {
    const dto = plainToInstance(LoginDto, { login: 'alice' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('should fail when login is an empty string', async () => {
    const dto = plainToInstance(LoginDto, { login: '', password: 'secret' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('SignupDto', () => {
  it('should pass with login and password', async () => {
    const dto = plainToInstance(SignupDto, {
      login: 'alice',
      password: 'secret',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when login is missing', async () => {
    const dto = plainToInstance(SignupDto, { password: 'secret' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('login');
  });

  it('should fail when password is an empty string', async () => {
    const dto = plainToInstance(SignupDto, { login: 'alice', password: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RefreshDto', () => {
  it('should pass with a non-empty refreshToken', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 'tok' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when refreshToken is missing', async () => {
    const dto = plainToInstance(RefreshDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('refreshToken');
  });

  it('should fail when refreshToken is an empty string', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateCategoryDto', () => {
  it('should pass with name and description', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: 'Tech',
      description: 'Technology articles',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const dto = plainToInstance(CreateCategoryDto, { description: 'x' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when description is missing', async () => {
    const dto = plainToInstance(CreateCategoryDto, { name: 'Tech' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  it('should fail when name is an empty string', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '',
      description: 'x',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateCategoryDto', () => {
  it('should pass with an empty object since all fields are optional', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with a partial payload', async () => {
    const dto = plainToInstance(UpdateCategoryDto, { name: 'Science' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when name is an empty string', async () => {
    const dto = plainToInstance(UpdateCategoryDto, { name: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateCommentDto', () => {
  it('should pass with content and a valid articleId', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      content: 'Great post!',
      articleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when content is missing', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      articleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('content');
  });

  it('should fail when articleId is missing', async () => {
    const dto = plainToInstance(CreateCommentDto, { content: 'x' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('articleId');
  });

  it('should fail when articleId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      content: 'x',
      articleId: 'not-a-uuid',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('articleId');
  });

  it('should fail when authorId is provided but not a valid UUID', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      content: 'x',
      articleId: '550e8400-e29b-41d4-a716-446655440000',
      authorId: 'bad-id',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('authorId');
  });
});

describe('CreateUserDto', () => {
  it('should pass with login and password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'bob',
      password: 'pass',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when login is missing', async () => {
    const dto = plainToInstance(CreateUserDto, { password: 'pass' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('login');
  });

  it('should fail when password is missing', async () => {
    const dto = plainToInstance(CreateUserDto, { login: 'bob' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('should fail when role is not a valid UserRole', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'bob',
      password: 'pass',
      role: 'superuser',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('role');
  });

  it('should pass when role is a valid UserRole', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'bob',
      password: 'pass',
      role: UserRole.EDITOR,
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

describe('UpdateUserDto', () => {
  it('should pass with an empty object since all fields are optional', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with oldPassword and newPassword', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      oldPassword: 'old',
      newPassword: 'new',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when role is not a valid UserRole', async () => {
    const dto = plainToInstance(UpdateUserDto, { role: 'god' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('role');
  });

  it('should pass when role is a valid UserRole', async () => {
    const dto = plainToInstance(UpdateUserDto, { role: UserRole.ADMIN });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when oldPassword is an empty string', async () => {
    const dto = plainToInstance(UpdateUserDto, { oldPassword: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('oldPassword');
  });
});
