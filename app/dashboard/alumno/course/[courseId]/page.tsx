"use client";

import { useEffect, useState } from 'react';
import Navbar from '../../_components/Navbar';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Quiz = { id: string; title: string; timeLimit?: number; maxAttempts?: number };

export default function CoursePage() {
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
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<any[] | null>(null);

  useEffect(() => { fetchCourse(); fetchAttempts(); }, [courseId]);

  async function fetchCourse() {
    try {
      const res = await fetch('/api/courses/enrolled', { credentials: 'include' });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      const found = data.find((c: any) => c.id === courseId);
      setCourse(found || null);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function fetchAttempts() {
    try {
      const res = await fetch(`/api/attempts/my?courseId=${courseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando intentos');
      const data = await res.json();
      setAttempts(data);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-4xl mx-auto">
        <Navbar name={profile?.name ?? null} />
        <div className="mb-4"><Link href="/dashboard/alumno" className="text-sm text-gray-300 hover:underline">← Volver</Link></div>
        {course ? (
          <>
            <h1 className="text-3xl font-bold text-blue-400">{course.title}</h1>
            <p className="text-gray-400 mb-4">{course.description}</p>

            <section id="quizzes" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Quizzes</h2>
              {(!course.quizzes || course.quizzes.length === 0) && <div className="text-gray-400">No hay quizzes para este curso.</div>}
              <ul className="space-y-2">
                {course.quizzes.map((q: Quiz) => (
                  <li key={q.id} className="p-3 bg-gray-800 rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{q.title}</div>
                      <div className="text-sm text-gray-400">Tiempo: {q.timeLimit} min • Intentos: {q.maxAttempts}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/alumno/quiz/${q.id}?autostart=1`} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">Iniciar</Link>
                      <Link href={`/dashboard/alumno/quiz/${q.id}`} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Ver</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Mis Intentos</h2>
              {(!attempts || attempts.length === 0) && <div className="text-gray-400">Aún no has realizado intentos.</div>}
              {attempts && attempts.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr><th className="px-2 py-2">Quiz</th><th className="px-2 py-2">Nota</th><th className="px-2 py-2">Inicio</th></tr>
                  </thead>
                  <tbody>
                    {attempts.map(a => (
                      <tr key={a.id} className="border-t border-slate-800"><td className="px-2 py-2">{a.quiz?.title}</td><td className="px-2 py-2">{a.score ?? '-'}</td><td className="px-2 py-2">{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : (
          <div className="text-gray-400">Curso no encontrado o no estás matriculado.</div>
        )}
      </div>
    </div>
  );
}
