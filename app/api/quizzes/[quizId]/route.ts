
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      select: {
        id: true,
        title: true,
        timeLimit: true,
        maxAttempts: true,
        courseId: true,
        questions: {
          select: {
            id: true,
            text: true,
            options: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('[API_GET_QUIZ_ID]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;
    if (!quizId) return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });

    // Verify that the requester is the teacher of the course
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('hlm-token='))?.split('=')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { jwtVerify } = await import('jose');
    let payload;
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as any;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = payload.sub ?? payload.userId ?? payload.id;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const course = await prisma.course.findUnique({ where: { id: quiz.courseId } });
    if (!course || course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // delete related answers, options, questions, attempts before deleting the quiz
    const questions = await prisma.question.findMany({ where: { quizId }, select: { id: true } });
    const questionIds = questions.map(q => q.id);

    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.option.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.question.deleteMany({ where: { quizId } }),
      prisma.quizAttempt.deleteMany({ where: { quizId } }),
      prisma.quiz.delete({ where: { id: quizId } }),
    ]);

    return NextResponse.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('[API_DELETE_QUIZ]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;
    if (!quizId) return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });

    // auth (cookie)
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('hlm-token='))?.split('=')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { jwtVerify } = await import('jose');
    let payload;
    try { const result = await jwtVerify(token, secret); payload = result.payload as any; } catch (e) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const actorId = payload.sub ?? payload.userId ?? payload.id;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const course = await prisma.course.findUnique({ where: { id: quiz.courseId } });
    if (!course || course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { title, timeLimit, maxAttempts, questions } = body;

    // Basic update for quiz meta
    const updated = await prisma.quiz.update({ where: { id: quizId }, data: { title: title ?? quiz.title, timeLimit: typeof timeLimit === 'number' ? timeLimit : quiz.timeLimit, maxAttempts: typeof maxAttempts === 'number' ? maxAttempts : quiz.maxAttempts } });

    // If questions provided, replace existing questions and options (simple strategy)
    if (Array.isArray(questions)) {
      const existingQuestions = await prisma.question.findMany({ where: { quizId }, select: { id: true } });
      const qIds = existingQuestions.map(q => q.id);

      await prisma.$transaction([
        prisma.answer.deleteMany({ where: { questionId: { in: qIds } } }),
        prisma.option.deleteMany({ where: { questionId: { in: qIds } } }),
        prisma.question.deleteMany({ where: { quizId } }),
      ]);

      // create new questions/options
      for (const q of questions) {
        await prisma.question.create({ data: { text: q.text, quizId: quizId, options: { create: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })) } } });
      }
    }

    return NextResponse.json({ message: 'Quiz updated', quiz: updated });
  } catch (error) {
    console.error('[API_PUT_QUIZ]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
