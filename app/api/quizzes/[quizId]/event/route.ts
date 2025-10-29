
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

const MAX_WARNINGS = 3;

export async function POST(request: Request, { params }: { params: { quizId: string } }) {
  try {
    const { quizId } = params;
    const studentId = await getUserId(request);

    if (!studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event } = body;

    if (event !== 'warning' && event !== 'leave') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Encontrar el intento más reciente y activo para este quiz y alumno
    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: {
        studentId,
        quizId,
        completedAt: null, // Solo consideramos intentos no finalizados
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!activeAttempt) {
      // Si no hay un intento activo, podría ser un primer intento que aún no se ha creado.
      // Opcional: Crear un intento aquí o manejarlo en el frontend.
      // Por ahora, devolvemos un error si no se encuentra un intento activo.
      return NextResponse.json({ error: 'No active quiz attempt found.' }, { status: 404 });
    }

    if (event === 'leave') {
      // Si el alumno cambia de pestaña/sale, consumimos el intento: lo marcamos como completado con score 0
      const updatedAttempt = await prisma.quizAttempt.update({
        where: { id: activeAttempt.id },
        data: {
          warnings: activeAttempt.warnings + 1,
          isBlocked: true,
          score: 0,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({ message: 'Attempt consumed due to leaving the page', warnings: updatedAttempt.warnings, isBlocked: updatedAttempt.isBlocked });
    }

    // Incrementar el contador de advertencias (event === 'warning')
    const newWarningCount = activeAttempt.warnings + 1;
    const shouldBlock = newWarningCount >= MAX_WARNINGS;

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: activeAttempt.id },
      data: {
        warnings: newWarningCount,
        isBlocked: shouldBlock,
        completedAt: shouldBlock ? new Date() : null,
      },
    });

    return NextResponse.json({ message: 'Event recorded successfully', warnings: updatedAttempt.warnings, isBlocked: updatedAttempt.isBlocked });

  } catch (error) {
    console.error('[API_POST_QUIZ_EVENT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
