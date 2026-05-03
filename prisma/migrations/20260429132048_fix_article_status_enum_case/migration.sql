-- Rename ArticleStatus enum values from lowercase (applied manually) to uppercase (schema definition)
-- Conditional: only runs if lowercase values exist (skipped on fresh installs where init already used uppercase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArticleStatus' AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE "ArticleStatus" RENAME VALUE 'draft' TO 'DRAFT';
    ALTER TYPE "ArticleStatus" RENAME VALUE 'published' TO 'PUBLISHED';
    ALTER TYPE "ArticleStatus" RENAME VALUE 'archived' TO 'ARCHIVED';
  END IF;
END
$$;
