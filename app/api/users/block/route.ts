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

    // Block by replacing the passwordHash with a random bcrypt hash so the student cannot login
    const random = Math.random().toString(36) + Date.now().toString(36);
    const hash = await bcrypt.hash(random, 10);

    await prisma.user.update({ where: { id: studentId }, data: { passwordHash: hash } });

    return NextResponse.json({ message: 'Student blocked' });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
