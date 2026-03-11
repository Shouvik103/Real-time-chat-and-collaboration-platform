-- AlterTable: Add inviteCode column with DB-level default for existing rows
ALTER TABLE "workspaces" ADD COLUMN "inviteCode" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_inviteCode_key" ON "workspaces"("inviteCode");
