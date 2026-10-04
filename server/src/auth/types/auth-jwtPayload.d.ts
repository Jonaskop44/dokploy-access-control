import { User as PrismaUser } from '../../config/prisma/generated/client.ts';

export type JwtPayload = {
  id: string;
  sub: {
    email: string;
    name: string;
    role: string;
  };
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}
