import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma/prisma.service.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByIdOrNull(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  upsertFromEntra(entraOid: string, email: string, name: string) {
    return this.prisma.user.upsert({
      where: { entraOid },
      create: { entraOid, email, name },
      update: { email, name },
    });
  }

  updateHashedRefreshToken(userId: string, hashedRefreshToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}
