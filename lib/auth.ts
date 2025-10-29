
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Asumimos que tienes una variable de entorno para el secreto del JWT
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in your environment variables');
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Verifica el token JWT de la cookie de la solicitud y devuelve el ID del usuario.
 * @param request La solicitud entrante de Next.js.
 * @returns El ID del usuario (string) si el token es válido, o null si no lo es.
 */
export async function getUserId(request: Request): Promise<string | null> {
  try {
    // Extraer la cookie del token
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('hlm-token='));
    if (!tokenCookie) return null;

    const token = tokenCookie.split('=')[1];
    if (!token) return null;

    // Verificar el token
    const { payload } = await jwtVerify(token, secretKey);

    // El ID del usuario puede estar en 'sub' o en 'userId' según cómo se forje el token
    if (typeof payload.sub === 'string') return payload.sub;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyPayload = payload as any;
    if (typeof anyPayload.userId === 'string') return anyPayload.userId;

    return null;
  } catch (error) {
    // Si hay un error en la verificación (token expirado, inválido, etc.), no autorizar
    console.error('JWT Verification Error:', error);
    return null;
  }
}
