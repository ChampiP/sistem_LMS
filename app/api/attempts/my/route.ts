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

    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const quizId = url.searchParams.get('quizId');

    const where: any = { studentId: actorId as string };
    if (courseId) where.quiz = { courseId };
    if (quizId) where.quizId = quizId;

    const attempts = await prisma.quizAttempt.findMany({ where, include: { quiz: { include: { course: true } }, answers: { include: { selectedOption: true } } }, orderBy: { startedAt: 'desc' }, take: 200 });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error('Error fetching my attempts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
