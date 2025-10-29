import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Importación moderna para verificar JWT en Edge

// Clave secreta (debe coincidir con la del .env)
const JWT_SECRET = process.env.JWT_SECRET;

// Función para codificar la clave (requerida por jose)
const getSecretKey = () => {
  if (!JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET no está definida');
  }
  return new TextEncoder().encode(JWT_SECRET);
};

/**
 * Este middleware intercepta las peticiones y protege las rutas.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- 1. Definir Rutas Protegidas ---
  // Todas las rutas del dashboard están protegidas
  const protectedPaths = ['/dashboard/docente', '/dashboard/alumno', '/quiz'];

  // Verificar si la ruta actual es una ruta protegida
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next(); // No es protegida, continuar
  }

  // --- 2. Verificar el "Pasaporte" (Token) ---
  const token = request.cookies.get('hlm-token')?.value;

  if (!token) {
    // No hay token, redirigir a login
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Página de login
    return NextResponse.redirect(url);
  }

  // --- 3. Validar el Token (Ciberseguridad) ---
  try {
    // Verificar si el token es válido y no ha expirado
    const { payload } = await jwtVerify(token, await getSecretKey());

    // Opcional: Verificar el rol (ej. si un alumno intenta entrar a /docente)
    const userRole = (payload as { role: string }).role;

    if (pathname.startsWith('/dashboard/docente') && userRole !== 'DOCENTE') {
      throw new Error('Acceso no autorizado para el rol');
    }

    if (pathname.startsWith('/dashboard/alumno') && userRole !== 'ALUMNO') {
      throw new Error('Acceso no autorizado para el rol');
    }

    // El token es válido y el rol es correcto, permitir el acceso
    return NextResponse.next();
  } catch (error) {
    // El token es inválido, expiró o fue manipulado
    console.error('Error de verificación de Middleware:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Página de login
    const response = NextResponse.redirect(url);
    // Limpiar la cookie inválida
    response.cookies.delete('hlm-token');
    return response;
  }
}

// Configuración del Matcher
// Especifica qué rutas activarán este middleware
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto las que probablemente
     * sean archivos estáticos o de la API.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
