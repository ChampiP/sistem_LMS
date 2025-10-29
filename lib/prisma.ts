/**
 * lib/prisma.ts
 *
 * Esta es la "llave maestra" de la bóveda de datos.
 * Instancia única de PrismaClient para ser reutilizada en toda la aplicación (Server Actions, API Routes).
 * Evita que se creen múltiples conexiones a la base de datos en desarrollo.
 */
import { PrismaClient } from '@prisma/client';

// Extiende el tipo global de Node.js para adjuntar la instancia de Prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// En producción, crea una nueva instancia.
// En desarrollo, reutiliza la instancia global 'prisma' si existe, o crea una nueva si no.
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Export both the default and a named export so files can import either style.
export default prisma;
export { prisma };
