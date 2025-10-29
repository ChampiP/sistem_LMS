/**
 * app/api/courses/route.ts
 *
 * API Endpoint para la gestión de Cursos.
 * Protegido por el Middleware (autenticación) y por lógica interna (autorización de ROL).
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma'; // Importamos la instancia única de Prisma

// Función para obtener el payload del JWT
async function getJwtPayload(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // Contiene id, email, role
  } catch (error) {
    return null;
  }
}

/**
 * POST /api/courses
 * Crea un nuevo curso. Solo para DOCENTES.
 */
export async function POST(request: Request) {
  try {
    // 1. Obtener el Token
  const token = cookies().get('hlm-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado: Sin token' },
        { status: 401 }
      );
    }

    // 2. Verificar el Token y el Rol
    const payload = await getJwtPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = (payload as any).role;
    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;

    if (role !== 'DOCENTE') {
      return NextResponse.json(
        { error: 'No autorizado: Rol inválido' },
        { status: 403 } // 403 Forbidden
      );
    }

    // 3. Obtener los datos del curso
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // 4. Crear el curso en la BD
    const newCourse = await prisma.course.create({
      data: {
        title,
        description: description || null,
        teacherId: actorId as string, // Asignamos el curso al docente autenticado
      },
    });

    return NextResponse.json(newCourse, { status: 201 }); // 201 Created
  } catch (error) {
    console.error('Error en POST /api/courses:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;

    const courses = await prisma.course.findMany({
      where: { teacherId: actorId as string },
      include: { quizzes: true, enrollments: { include: { student: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error en GET /api/courses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (payload as any).role;
    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;
    if (role !== 'DOCENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { courseId, title, description } = body;
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.course.update({ where: { id: courseId }, data: { title: title ?? course.title, description: description ?? course.description } });
    return NextResponse.json({ message: 'Course updated', course: updated });
  } catch (error) {
    console.error('Error en PUT /api/courses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (payload as any).role;
    const actorId = (payload as any).sub ?? (payload as any).userId ?? (payload as any).id;
    if (role !== 'DOCENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Gather related entities and delete in safe order
    const quizzes = await prisma.quiz.findMany({ where: { courseId }, select: { id: true } });
    const quizIds = quizzes.map(q => q.id);
    const questions = await prisma.question.findMany({ where: { quizId: { in: quizIds } }, select: { id: true } });
    const questionIds = questions.map(q => q.id);

    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.option.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.question.deleteMany({ where: { quizId: { in: quizIds } } }),
      prisma.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } }),
      prisma.quiz.deleteMany({ where: { courseId } }),
      prisma.enrollment.deleteMany({ where: { courseId } }),
      prisma.course.delete({ where: { id: courseId } }),
    ]);

    return NextResponse.json({ message: 'Course and related data deleted' });
  } catch (error) {
    console.error('Error en DELETE /api/courses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}