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

export async function GET(request: Request) {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (payload as any).role;
    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;
    if (role !== 'DOCENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Allow optional query filters: quizId, courseId
    const url = new URL(request.url);
  const quizId = url.searchParams.get('quizId');
  const courseId = url.searchParams.get('courseId');
  const studentId = url.searchParams.get('studentId');

  const where: any = { quiz: { course: { teacherId: actorId } } };
  if (quizId) where.quiz = { id: quizId, course: { teacherId: actorId } };
  if (courseId) where.quiz = { courseId, course: { teacherId: actorId } };
  if (studentId) where.studentId = studentId;

    // Find attempts for quizzes that belong to courses taught by this teacher (optionally filtered)
    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: { student: true, quiz: true, answers: { include: { selectedOption: true } } },
      orderBy: { startedAt: 'desc' },
      take: 2000,
    });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error('Error fetching attempts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
