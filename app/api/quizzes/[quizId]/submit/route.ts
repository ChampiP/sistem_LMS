
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/auth'; // Asumimos que existe un helper de autenticación

interface AnswerPayload {
  questionId: string;
  selectedOptionId: string;
}

export async function POST(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;
    const answers: AnswerPayload[] = await request.json();

    // TODO: Implementar getUserId para obtener el ID del alumno desde el token de sesión
    const studentId = await getUserId(request);
    if (!studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Obtener el quiz y las respuestas correctas desde la BD
    const quizWithCorrectAnswers = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: {
              where: { isCorrect: true },
            },
          },
        },
      },
    });

    if (!quizWithCorrectAnswers) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // 2. Crear un mapa de referencia para las respuestas correctas
    const correctAnswersMap = new Map<string, string>();
    quizWithCorrectAnswers.questions.forEach(q => {
      if (q.options.length > 0) {
        correctAnswersMap.set(q.id, q.options[0].id);
      }
    });

    // 3. Calcular la puntuación
    let correctCount = 0;
    answers.forEach(answer => {
      if (correctAnswersMap.get(answer.questionId) === answer.selectedOptionId) {
        correctCount++;
      }
    });

    const totalQuestions = quizWithCorrectAnswers.questions.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // 4. Guardar el intento y las respuestas: preferimos actualizar el intento activo
    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: { studentId, quizId, completedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    let savedAttempt;

    if (activeAttempt) {
      savedAttempt = await prisma.quizAttempt.update({
        where: { id: activeAttempt.id },
        data: {
          score: score,
          completedAt: new Date(),
          answers: {
            create: answers.map(ans => ({
              questionId: ans.questionId,
              selectedOptionId: ans.selectedOptionId,
            })),
          },
        },
        include: { answers: true },
      });
    } else {
      savedAttempt = await prisma.quizAttempt.create({
        data: {
          studentId: studentId,
          quizId: quizId,
          score: score,
          completedAt: new Date(),
          answers: {
            create: answers.map(ans => ({
              questionId: ans.questionId,
              selectedOptionId: ans.selectedOptionId,
            })),
          },
        },
        include: { answers: true },
      });
    }

    return NextResponse.json({ 
      message: 'Quiz submitted successfully', 
      score: savedAttempt.score,
      attemptId: savedAttempt.id,
    });

  } catch (error) {
    console.error('[API_POST_QUIZ_SUBMIT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
