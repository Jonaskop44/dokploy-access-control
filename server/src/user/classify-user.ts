import { Role } from '../config/prisma/generated/enums.js';

const CLASS_SUFFIX = /,\s*(\d[A-Z]+)\s*$/;

export function classifyUser(name: string) {
  const className = CLASS_SUFFIX.exec(name)?.[1] ?? null;
  return {
    role: className ? Role.STUDENT : Role.TEACHER,
    className,
  };
}
