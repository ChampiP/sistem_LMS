import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { validateQuizPayload } from '@/lib/validators';

async function getJwtPayload(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * POST /api/quizzes
 * Body: { title, courseId, timeLimit, maxAttempts, questions: [{ text, options: [{ text, isCorrect }] }] }
 */
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
  const { title, courseId, timeLimit, maxAttempts, questions } = body;
  const v = validateQuizPayload(body);
  if (!v.valid) return NextResponse.json({ error: 'Invalid payload', details: v.errors }, { status: 400 });

    // verify teacher owns the course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // create quiz with nested questions/options
    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseId,
        timeLimit: Number(timeLimit) || 0,
        maxAttempts: Number(maxAttempts) || 1,
        questions: {
          create: (questions || []).map((q: any) => ({
            text: q.text,
            options: { create: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })) },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });

    return NextResponse.json({ message: 'Quiz created', quiz }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
