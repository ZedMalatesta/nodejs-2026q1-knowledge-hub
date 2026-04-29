-- Rename ArticleStatus enum values from lowercase (applied manually) to uppercase (schema definition)
ALTER TYPE "ArticleStatus" RENAME VALUE 'draft' TO 'DRAFT';
ALTER TYPE "ArticleStatus" RENAME VALUE 'published' TO 'PUBLISHED';
ALTER TYPE "ArticleStatus" RENAME VALUE 'archived' TO 'ARCHIVED';
