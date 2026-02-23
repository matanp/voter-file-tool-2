import { PrismaClient } from "@prisma/client";
import { auditLogImmutabilityGuard } from "./auditLogGuard";

// Extending the global interface directly
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  prisma.$use(auditLogImmutabilityGuard);
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
    global.prisma.$use(auditLogImmutabilityGuard);
  }
  prisma = global.prisma;
}

export default prisma;
