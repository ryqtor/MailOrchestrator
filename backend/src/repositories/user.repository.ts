import { prisma } from '../db/prisma';
import { User } from '@prisma/client';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async create(data: { email: string; name: string; avatarUrl?: string; googleId?: string; passwordHash?: string }): Promise<User> {
    return prisma.user.create({ data });
  }

  async ensureDefaultUser(): Promise<User> {
    const existing = await prisma.user.findFirst();
    if (existing) return existing;

    return prisma.user.create({
      data: {
        id: 'default-system-user-id',
        email: 'admin@mailorchestrator.internal',
        name: 'System Admin',
      },
    });
  }
}
