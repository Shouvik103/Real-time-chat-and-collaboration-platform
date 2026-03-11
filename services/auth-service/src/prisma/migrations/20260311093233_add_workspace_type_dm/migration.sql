-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('GROUP', 'DM');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "maxMembers" INTEGER,
ADD COLUMN     "type" "WorkspaceType" NOT NULL DEFAULT 'GROUP',
ALTER COLUMN "inviteCode" DROP DEFAULT;
