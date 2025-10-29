const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CANDIDATES = [process.env.BASE_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'].filter(Boolean);

async function detectBase() {
  for (const base of CANDIDATES) {
    try {
      const res = await fetch(base + '/');
      if (res && res.status < 500) return base;
    } catch (e) {
      // ignore
    }
  }
  throw new Error('No running server detected on localhost ports 3000-3002. Start the dev server (npm run dev) and retry, or set BASE_URL env var.');
}

function pickCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  // In Node fetch, header may be single string or multiple separated; take first cookie pair
  const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return raw.split(';')[0];
}

async function run() {
  const BASE = await detectBase();
  console.log('Integration test starting against', BASE);

  // find quiz id via prisma (we have DB access in test env)
  const quiz = await prisma.quiz.findFirst({ where: { title: 'Quiz de Ejemplo' }, include: { questions: { include: { options: true } } } });
  if (!quiz) {
    console.error('Quiz de Ejemplo not found in DB. Run seed first.');
    process.exit(1);
  }

  // 1) Login as student
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alumno@hlm.test', password: 'password123' }),
  });

  const loginJson = await loginRes.json().catch(() => ({}));
  console.log('Login status:', loginRes.status, loginJson.message || loginJson.error || '');

  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = pickCookie(setCookie);
  if (!cookie) {
    console.warn('No cookie received, proceeding without cookie may fail.');
  } else {
    console.log('Received cookie:', cookie.split('=')[0]);
  }

  // 2) Start attempt
  const startRes = await fetch(`${BASE}/api/quizzes/${quiz.id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
  });
  const startJson = await startRes.json().catch(() => ({}));
  console.log('Start attempt status:', startRes.status, startJson.error || startJson.attemptId || startJson.message || '');
  const attemptId = startJson.attemptId;

  // 3) Prepare answers: pick first option for each question
  const answers = quiz.questions.map((q) => ({ questionId: q.id, selectedOptionId: q.options[0].id }));

  // 4) Submit
  const submitRes = await fetch(`${BASE}/api/quizzes/${quiz.id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(answers),
  });
  const submitJson = await submitRes.json().catch(() => ({}));
  console.log('Submit status:', submitRes.status, submitJson.message || submitJson.error || submitJson.score || '');
  console.log('Submit response:', submitJson);

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Integration test failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
