const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const teacherEmail = 'docente@hlm.test';
  const studentEmail = 'alumno@hlm.test';
  const defaultPassword = 'password123';

  // Hash password
  const hashed = await bcrypt.hash(defaultPassword, 12);

  // Upsert teacher
  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { name: 'Docente Ejemplo', passwordHash: hashed, role: 'DOCENTE' },
    create: { email: teacherEmail, name: 'Docente Ejemplo', passwordHash: hashed, role: 'DOCENTE' },
  });

  // Upsert student
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { name: 'Alumno Ejemplo', passwordHash: hashed, role: 'ALUMNO' },
    create: { email: studentEmail, name: 'Alumno Ejemplo', passwordHash: hashed, role: 'ALUMNO' },
  });

  console.log('Users ready:', teacher.email, student.email);

  // Create a course by the teacher (find or create)
  let course = await prisma.course.findFirst({ where: { title: 'Introducción a Pruebas' } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        title: 'Introducción a Pruebas',
        description: 'Curso de ejemplo creado por seed script',
        teacherId: teacher.id,
      },
    });
  }

  // Enroll student
  try {
    await prisma.enrollment.create({
      data: { studentId: student.id, courseId: course.id },
    });
  } catch (e) {
    // ignore if already enrolled (unique constraint)
  }

  // Create a quiz with questions and options (find or create)
  let quiz = await prisma.quiz.findFirst({ where: { title: 'Quiz de Ejemplo' } });
  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: 'Quiz de Ejemplo',
        courseId: course.id,
        timeLimit: 10, // minutes
        maxAttempts: 3,
        questions: {
          create: [
            {
              text: '¿Cuál es la capital de Francia?',
              options: {
                create: [
                  { text: 'París', isCorrect: true },
                  { text: 'Londres' },
                  { text: 'Berlín' },
                  { text: 'Madrid' },
                ],
              },
            },
            {
              text: '¿Cuál es 2 + 2?',
              options: {
                create: [
                  { text: '3' },
                  { text: '4', isCorrect: true },
                  { text: '22' },
                  { text: '5' },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log('Seed completed.');
  console.log('Teacher:', teacherEmail, 'password:', defaultPassword);
  console.log('Student:', studentEmail, 'password:', defaultPassword);
  console.log('Course:', course.title);
  console.log('Quiz:', quiz.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
