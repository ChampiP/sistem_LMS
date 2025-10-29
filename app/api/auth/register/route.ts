import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isEmail, validatePassword } from '@/lib/validators';

/**
 * Endpoint de API para registrar un nuevo usuario (Alumno por defecto).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // --- 1. Validación de Entrada ---
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (nombre, email, contraseña)' },
        { status: 400 } // 400 Bad Request
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 });
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.error }, { status: 400 });
    }

    // --- 2. Verificar si el usuario ya existe ---
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está en uso' },
        { status: 409 } // 409 Conflict
      );
    }

    // --- 3. Hashear la contraseña (Seguridad) ---
    // Como estudiante de ciberseguridad, sabes que el 'salt' es crucial.
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- 4. Crear el nuevo usuario en la DB ---
    // Por defecto, todos los registros son 'ALUMNO'.
    const user = await prisma.user.create({
      data: {
        email,
        name,
        // ¡Corrección clave! El schema espera 'passwordHash'
        passwordHash: hashedPassword,
        role: 'ALUMNO', // Rol por defecto
      },
    });

    // --- 5. Éxito ---
    // Crear JWT y establecer cookie HttpOnly para auto-login
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET no definido');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(tokenPayload, JWT_SECRET as string, { expiresIn: '1d' });

  const cookieParts = [`hlm-token=${token}`, 'HttpOnly', 'Path=/', `Max-Age=${60 * 60 * 24}`, 'SameSite=Lax'];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');

    return NextResponse.json(
      { message: 'Usuario creado exitosamente', userId: user.id, token },
      { status: 201, headers: { 'Set-Cookie': cookieParts.join('; ') } }
    );

  } catch (error: any) {
    console.error('Error en API de registro:', error);

    // Manejo de errores de Prisma (ej. validación)
    if (error.name === 'PrismaClientValidationError') {
      return NextResponse.json(
        { error: 'Error de validación de datos', details: error.message },
        { status: 400 }
      );
    }

    // Error genérico del servidor
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}