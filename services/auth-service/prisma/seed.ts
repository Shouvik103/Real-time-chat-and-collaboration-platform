// =============================================================================
// Prisma Seed Script — Demo data for development
// Run: npx prisma db seed --schema=src/prisma/schema.prisma
// =============================================================================

import { PrismaClient, AuthProvider, UserStatus, ChannelType, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Create demo users ────────────────────────────────────────────────

  const password = await bcrypt.hash('Demo@Pass1', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: {
      email: 'alice@demo.com',
      password,
      displayName: 'Alice Johnson',
      status: UserStatus.ACTIVE,
      provider: AuthProvider.LOCAL,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: {},
    create: {
      email: 'bob@demo.com',
      password,
      displayName: 'Bob Smith',
      status: UserStatus.ACTIVE,
      provider: AuthProvider.LOCAL,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@demo.com' },
    update: {},
    create: {
      email: 'charlie@demo.com',
      password,
      displayName: 'Charlie Brown',
      status: UserStatus.ACTIVE,
      provider: AuthProvider.LOCAL,
    },
  });

  console.log(`  ✓ Created users: ${alice.email}, ${bob.email}, ${charlie.email}`);

  // ── 2. Create workspaces ────────────────────────────────────────────────

  const workspace1 = await prisma.workspace.upsert({
    where: { slug: 'engineering' },
    update: {},
    create: {
      name: 'Engineering',
      slug: 'engineering',
      description: 'Engineering team workspace',
      ownerId: alice.id,
    },
  });

  const workspace2 = await prisma.workspace.upsert({
    where: { slug: 'design' },
    update: {},
    create: {
      name: 'Design',
      slug: 'design',
      description: 'Design team workspace',
      ownerId: bob.id,
    },
  });

  console.log(`  ✓ Created workspaces: ${workspace1.name}, ${workspace2.name}`);

  // ── 3. Add members to workspaces ────────────────────────────────────────

  const memberships = [
    { userId: alice.id, workspaceId: workspace1.id, role: WorkspaceRole.OWNER },
    { userId: bob.id, workspaceId: workspace1.id, role: WorkspaceRole.MEMBER },
    { userId: charlie.id, workspaceId: workspace1.id, role: WorkspaceRole.MEMBER },
    { userId: bob.id, workspaceId: workspace2.id, role: WorkspaceRole.OWNER },
    { userId: alice.id, workspaceId: workspace2.id, role: WorkspaceRole.MEMBER },
  ];

  for (const m of memberships) {
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: m.userId, workspaceId: m.workspaceId } },
      update: {},
      create: m,
    });
  }

  console.log(`  ✓ Added ${memberships.length} workspace memberships`);

  // ── 4. Create channels ──────────────────────────────────────────────────

  const channels = [
    { name: 'general', workspaceId: workspace1.id, type: ChannelType.PUBLIC, description: 'General discussion' },
    { name: 'backend', workspaceId: workspace1.id, type: ChannelType.PUBLIC, description: 'Backend development' },
    { name: 'frontend', workspaceId: workspace1.id, type: ChannelType.PUBLIC, description: 'Frontend development' },
    { name: 'general', workspaceId: workspace2.id, type: ChannelType.PUBLIC, description: 'General design discussion' },
  ];

  for (const ch of channels) {
    await prisma.channel.upsert({
      where: { workspaceId_name: { workspaceId: ch.workspaceId, name: ch.name } },
      update: {},
      create: ch,
    });
  }

  console.log(`  ✓ Created ${channels.length} channels`);
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
