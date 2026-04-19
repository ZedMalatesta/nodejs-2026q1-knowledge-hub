-- Rename old enum to temp name
ALTER TYPE "Role" RENAME TO "_Role_old";

-- Create new enum with lowercase values
CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'viewer');

-- Migrate column using CASE to map old uppercase values to new lowercase ones
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role" USING (
    CASE "role"::text
      WHEN 'ADMIN'  THEN 'admin'::"Role"
      WHEN 'EDITOR' THEN 'editor'::"Role"
      WHEN 'VIEWER' THEN 'viewer'::"Role"
      ELSE 'viewer'::"Role"
    END
  ),
  ALTER COLUMN "role" SET DEFAULT 'viewer';

-- Drop old enum
DROP TYPE "_Role_old";
