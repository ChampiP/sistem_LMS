import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function getJwtPayload(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (payload as any).role;
    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;
    if (role !== 'DOCENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { studentId } = body;
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    // Verify teacher has the student in at least one of their courses
    const enrollment = await prisma.enrollment.findFirst({ where: { studentId, course: { teacherId: actorId } }, include: { course: true } });
    if (!enrollment) return NextResponse.json({ error: 'Forbidden: student not in your courses' }, { status: 403 });

    // Generate a temporary password and set it for the student. Return the temp password so teacher can share it.
    const temp = Math.random().toString(36).slice(2, 10);
    const hash = await bcrypt.hash(temp, 10);

    await prisma.user.update({ where: { id: studentId }, data: { passwordHash: hash } });

    return NextResponse.json({ message: 'Student unblocked', tempPassword: temp });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
