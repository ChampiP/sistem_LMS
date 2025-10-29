
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;
    const studentId = await getUserId(request);

    if (!studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verificar si el alumno puede iniciar el intento (matrícula y número de intentos)
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { maxAttempts: true, courseId: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: quiz.courseId } },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Count previous attempts (all attempts, including blocked/completed)
    const previousAttempts = await prisma.quizAttempt.count({ where: { studentId, quizId } });

    const maxAttempts = typeof quiz.maxAttempts === 'number' ? quiz.maxAttempts : Infinity;
    if (previousAttempts >= maxAttempts) {
      return NextResponse.json({ error: 'Maximum attempts reached' }, { status: 403 });
    }

    // Prevent creating a new attempt if there is already an active attempt (not completed)
    const activeAttempt = await prisma.quizAttempt.findFirst({ where: { studentId, quizId, completedAt: null } });
    if (activeAttempt) {
      return NextResponse.json({ error: 'An active attempt already exists' }, { status: 409 });
    }

    // 2. Crear el nuevo intento
    const newAttempt = await prisma.quizAttempt.create({
      data: {
        studentId,
        quizId,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ attemptId: newAttempt.id });

  } catch (error) {
    console.error('[API_POST_QUIZ_START]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
