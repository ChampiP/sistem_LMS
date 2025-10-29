"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './_components/Navbar';
import { useRouter } from 'next/navigation';

type Course = { id: string; title: string; description?: string; teacher?: { id: string; name?: string }; quizzes?: any[] };
type Attempt = { id: string; quiz?: { id: string; title?: string; course?: { id: string; title?: string } }; score?: number | null; startedAt?: string };

export default function AlumnoDashboard() {
  const [profile, setProfile] = useState<{ name?: string | null } | null>(null);
  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return;
      const j = await res.json();
      setProfile(j);
    } catch (e) { /* ignore */ }
  }

  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const router = useRouter();

  useEffect(() => { fetchEnrolled(); fetchAttempts(); }, []);

  async function fetchEnrolled() {
    try {
      const res = await fetch('/api/courses/enrolled', { credentials: 'include' });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setCourses(data);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function fetchAttempts() {
    try {
      const res = await fetch('/api/attempts/my', { credentials: 'include' });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setAttempts(data || []);
    } catch (e: any) { /* ignore silently */ }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    router.push('/');
  }

  // build set of quizzes already completed (completedAt set) so we don't show them as upcoming
  const completedQuizIds = new Set((attempts || []).filter(a => a.quiz?.id && a.startedAt && (a.score !== null || a.startedAt)).map(a => a.quiz?.id));
  const upcoming = courses.flatMap(c => (c.quizzes || []).map(q => ({ ...q, courseTitle: c.title, courseId: c.id }))).filter((q: any) => !completedQuizIds.has(q.id)).slice(0, 6);
  const recentGrades = attempts.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Navbar name={profile?.name ?? null} />
            <h1 className="text-3xl font-bold text-blue-400 mb-2">Panel del Alumno</h1>
            <div className="text-sm text-gray-400">Bienvenido — aquí tienes un resumen rápido de tu actividad.</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/alumno')} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">Mi panel</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="p-4 bg-gray-800 rounded">
              <h2 className="text-xl font-semibold mb-3">Próximos Quizzes</h2>
              {upcoming.length === 0 && <div className="text-gray-400">No hay quizzes próximos.</div>}
              <ul className="space-y-2">
                {upcoming.map((q: any) => (
                  <li key={q.id} className="p-3 bg-gray-900 rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{q.title}</div>
                      <div className="text-sm text-gray-400">Curso: {q.courseTitle}</div>
                    </div>
                    <div>
                      <Link href={`/dashboard/alumno/quiz/${q.id}?autostart=1`} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">Ir al Quiz</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="p-4 bg-gray-800 rounded">
                  <h2 className="text-xl font-semibold mb-3">Últimas Calificaciones</h2>
              {recentGrades.length === 0 && <div className="text-gray-400">Aún no tienes calificaciones.</div>}
              {recentGrades.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400"><tr><th className="px-2 py-2">Quiz</th><th className="px-2 py-2">Curso</th><th className="px-2 py-2">Nota</th><th className="px-2 py-2">Fecha</th></tr></thead>
                  <tbody>
                    {recentGrades.map(a => (
                      <tr key={a.id} className="border-t border-slate-800"><td className="px-2 py-2">{a.quiz?.title}</td><td className="px-2 py-2">{a.quiz?.course?.title}</td><td className="px-2 py-2">{a.score ?? '-'}</td><td className="px-2 py-2">{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="font-semibold mb-2">Mis Cursos</h3>
              <ul className="space-y-2 text-sm">
                {courses.map(c => (
                  <li key={c.id} className="flex justify-between items-center">
                    <div className="text-gray-200">{c.title}</div>
                    <Link href={`/dashboard/alumno/course/${c.id}`} className="text-sm text-indigo-400 hover:underline">Ver</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-gray-800 rounded">
              <h3 className="font-semibold mb-2">Anuncios</h3>
              <div className="text-sm text-gray-400">No hay anuncios por ahora.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
// End of student dashboard component
