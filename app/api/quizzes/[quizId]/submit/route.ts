
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/auth'; // Asumimos que existe un helper de autenticación
import { validateSubmitAgainstQuiz } from '@/lib/validators';

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

    // 1. Obtener el quiz y sus preguntas/opciones desde la BD (necesitamos todas las opciones para validar)
    const quizWithCorrectAnswers = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quizWithCorrectAnswers) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // 2. Validar que las respuestas coinciden con las preguntas/opciones del quiz
    const validation = validateSubmitAgainstQuiz(quizWithCorrectAnswers, answers as any[]);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid answers', details: validation.errors }, { status: 400 });
    }

    // 3. Crear un mapa de respuestas correctas
    const correctAnswersMap = new Map<string, string>();
    quizWithCorrectAnswers.questions.forEach(q => {
      const correctOpt = (q.options || []).find((o: any) => o.isCorrect);
      if (correctOpt) correctAnswersMap.set(q.id, correctOpt.id);
    });

    // 4. Calcular la puntuación
    let correctCount = 0;
    (answers as any[]).forEach(answer => {
      if (correctAnswersMap.get(answer.questionId) === answer.selectedOptionId) correctCount++;
    });

    const totalQuestions = quizWithCorrectAnswers.questions.length;
    // nota en escala 0..20, sin decimales. Redondeamos al entero más cercano.
    const nota = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 20) : 0;
    // además devolvemos porcentaje por compatibilidad
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

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
          score: nota,
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
          score: nota,
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
      nota: savedAttempt.score,
      scorePercent,
      attemptId: savedAttempt.id,
    });

  } catch (error) {
    console.error('[API_POST_QUIZ_SUBMIT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
