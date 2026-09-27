-- Create the normalized Role table
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Role names must be unique
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE INDEX "Role_name_idx" ON "Role"("name");

-- Insert the two application roles
INSERT INTO "Role" ("id", "name", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'USER', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'ADMIN', CURRENT_TIMESTAMP);

-- Temporarily add roleId as nullable so existing users can be migrated
ALTER TABLE "User"
ADD COLUMN "roleId" TEXT;

-- Transfer every existing user's old enum role into the new Role table
UPDATE "User" AS u
SET "roleId" = r."id"
FROM "Role" AS r
WHERE r."name" = u."role"::text;

-- Verify every user received a role before making the column required
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        WHERE "roleId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Role migration failed: one or more users have no role';
    END IF;
END $$;

-- roleId is now safe to make required
ALTER TABLE "User"
ALTER COLUMN "roleId" SET NOT NULL;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- Add relation between User and Role
ALTER TABLE "User"
ADD CONSTRAINT "User_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "Role"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Old enum column is no longer needed
ALTER TABLE "User"
DROP COLUMN "role";

-- Remove the old enum type
DROP TYPE "UserRole";
