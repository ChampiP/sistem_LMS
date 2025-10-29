import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Cargar la clave secreta desde las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Este error es intencional para detener el servidor si la clave no está.
  throw new Error('La variable de entorno JWT_SECRET no está definida');
}

/**
 * Endpoint de API para autenticar un usuario (Login).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // --- 1. Validación de Entrada ---
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos (email, contraseña)' },
        { status: 400 }
      );
    }

    // --- 2. Buscar al usuario ---
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.warn(`[login] user not found for email=${email}`);
      const body: any = { error: 'Credenciales inválidas' };
      if (process.env.DEBUG_AUTH === '1') body.debug = 'user-not-found';
      return NextResponse.json(body, { status: 401 });
    }

    // --- 3. Verificar la contraseña (Ciberseguridad) ---
    // Comparamos el hash de la DB con la contraseña enviada.
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } catch (err) {
      console.error('[login] bcrypt.compare error for email=', email, err);
    }

    if (!isPasswordValid) {
      console.warn(`[login] invalid password for email=${email}`);
      const body: any = { error: 'Credenciales inválidas' };
      if (process.env.DEBUG_AUTH === '1') body.debug = 'invalid-password';
      return NextResponse.json(body, { status: 401 });
    }

    // --- 4. Forjar el "Pasaporte" (JWT) ---
    // Forzamos el ID del usuario en la claim 'sub' (subject), y dejamos otras claims útiles.
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET as string, {
      expiresIn: '1d', // El token expira en 1 día
    });

    // --- 5. Éxito ---
    // Además de devolver el token en JSON, establecemos una cookie HttpOnly para uso por la API.
  const cookieParts = [`hlm-token=${token}`, 'HttpOnly', 'Path=/', `Max-Age=${60 * 60 * 24}`, 'SameSite=Lax'];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');

    return NextResponse.json(
      {
        message: 'Inicio de sesión exitoso',
        token,
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
      },
      { status: 200, headers: { 'Set-Cookie': cookieParts.join('; ') } }
    );
  } catch (error: any) {
    console.error('Error en API de login:', error);
    // Loguear el error real en el servidor
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
