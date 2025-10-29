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
    const studentId = url.searchParams.get('studentId');
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    // Ensure the teacher has this student enrolled in at least one of their courses
    const enrollment = await prisma.enrollment.findFirst({ where: { studentId, course: { teacherId: actorId } } });
    if (!enrollment) return NextResponse.json({ error: 'Forbidden: student not in your courses' }, { status: 403 });

    // Prevent deleting a user that is a teacher (avoid FK constraint on Course.teacherId)
    const targetUser = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if ((targetUser as any).role === 'DOCENTE') return NextResponse.json({ error: 'Cannot delete a teacher account' }, { status: 403 });

    // Delete cascade: delete answers -> attempts -> enrollments -> user
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { attempt: { studentId } } }),
      prisma.quizAttempt.deleteMany({ where: { studentId } }),
      prisma.enrollment.deleteMany({ where: { studentId } }),
      prisma.user.delete({ where: { id: studentId } }),
    ]);

    return NextResponse.json({ message: 'Student and related data deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
