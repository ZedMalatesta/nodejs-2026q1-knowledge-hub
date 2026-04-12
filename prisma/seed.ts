import { PrismaClient, Role, ArticleStatus } from '@prisma/client';
import 'dotenv/config';

const prisma = new (PrismaClient as any)({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  // Clear existing data
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users
  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: 'adminpassword',
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      login: 'editor',
      password: 'editorpassword',
      role: Role.EDITOR,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      login: 'viewer',
      password: 'viewerpassword',
      role: Role.VIEWER,
    },
  });

  // 2. Categories
  const catTech = await prisma.category.create({
    data: {
      name: 'Technology',
      description: 'Everything about tech',
    },
  });

  const catScience = await prisma.category.create({
    data: {
      name: 'Science',
      description: 'Everything about science',
    },
  });

  const catNature = await prisma.category.create({
    data: {
      name: 'Nature',
      description: 'Everything about nature',
    },
  });

  // 3. Tags
  const tagNode = await prisma.tag.create({ data: { name: 'Node.js' } });
  const tagPrisma = await prisma.tag.create({ data: { name: 'Prisma' } });
  const tagReact = await prisma.tag.create({ data: { name: 'React' } });
  const tagPhysics = await prisma.tag.create({ data: { name: 'Physics' } });
  const tagSpace = await prisma.tag.create({ data: { name: 'Space' } });

  // 4. Articles
  const article1 = await prisma.article.create({
    data: {
      title: 'Prisma is Great',
      content: 'Lorum ipsum for prisma...',
      status: ArticleStatus.PUBLISHED,
      authorId: admin.id,
      categoryId: catTech.id,
      tags: { connect: [{ id: tagNode.id }, { id: tagPrisma.id }] },
    },
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'Science of Tomorrow',
      content: 'Lorum ipsum for science...',
      status: ArticleStatus.DRAFT,
      authorId: editor.id,
      categoryId: catScience.id,
      tags: { connect: [{ id: tagPhysics.id }, { id: tagSpace.id }] },
    },
  });

  const article3 = await prisma.article.create({
    data: {
      title: 'Nature Wonders',
      content: 'Lorum ipsum for nature...',
      status: ArticleStatus.PUBLISHED,
      authorId: admin.id,
      categoryId: catNature.id,
      tags: { connect: [{ id: tagReact.id }] },
    },
  });

  const article4 = await prisma.article.create({
    data: {
      title: 'Archived Tech',
      content: 'Old tech info...',
      status: ArticleStatus.ARCHIVED,
      authorId: editor.id,
      categoryId: catTech.id,
    },
  });

  const article5 = await prisma.article.create({
    data: {
      title: 'Newer Tech',
      content: 'New tech info...',
      status: ArticleStatus.PUBLISHED,
      authorId: admin.id,
      categoryId: catTech.id,
      tags: { connect: [{ id: tagNode.id }] },
    },
  });

  // 5. Comments
  await prisma.comment.create({
    data: {
      content: 'Nice article!',
      authorId: viewer.id,
      articleId: article1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Very informative.',
      authorId: editor.id,
      articleId: article3.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'I disagree.',
      authorId: admin.id,
      articleId: article5.id,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
