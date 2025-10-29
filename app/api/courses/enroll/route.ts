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
    const { courseId, email } = body;
    if (!courseId || !email) return NextResponse.json({ error: 'courseId and email required' }, { status: 400 });

    // verify teacher owns the course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const student = await prisma.user.findUnique({ where: { email } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // create enrollment if not exists
    try {
      const enrollment = await prisma.enrollment.create({ data: { studentId: student.id, courseId } });
      return NextResponse.json({ message: 'Enrolled', enrollment });
    } catch (e) {
      // probably already enrolled
      return NextResponse.json({ message: 'Already enrolled' });
    }
  } catch (error) {
    console.error('Error enroll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
