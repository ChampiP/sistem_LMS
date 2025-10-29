import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

async function getJwtPayload(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;

    // Find courses where the user is enrolled
    const enrollments = await prisma.enrollment.findMany({ where: { studentId: actorId as string }, include: { course: { include: { quizzes: true, teacher: true }, }, }, orderBy: { createdAt: 'desc' } });

    const courses = enrollments.map(e => ({ id: e.course.id, title: e.course.title, description: e.course.description, teacher: { id: e.course.teacher.id, name: e.course.teacher.name }, quizzes: e.course.quizzes }));

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error en GET /api/courses/enrolled:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
