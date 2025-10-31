"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DocenteIndex() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-blue-400 mb-2">Panel del Docente</h1>
            <p className="mb-6 text-gray-400">Bienvenido — usa las secciones para administrar cursos, quizzes y alumnos.</p>
          </div>
          <div>
            <button onClick={handleLogout} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded">Cerrar sesión</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/dashboard/docente/courses" className="block p-6 bg-white/5 rounded hover:bg-white/6">
            <h2 className="text-lg font-semibold">Cursos</h2>
            <p className="text-sm text-gray-400 mt-2">Crear y administrar cursos; matricular alumnos.</p>
          </Link>

          <Link href="/dashboard/docente/quizzes" className="block p-6 bg-white/5 rounded hover:bg-white/6">
            <h2 className="text-lg font-semibold">Quizzes</h2>
            <p className="text-sm text-gray-400 mt-2">Crear quizzes mediante interfaz gráfica — sin JSON.</p>
          </Link>

          <Link href="/dashboard/docente/alumnos" className="block p-6 bg-white/5 rounded hover:bg-white/6">
            <h2 className="text-lg font-semibold">Alumnos</h2>
            <p className="text-sm text-gray-400 mt-2">Ver alumnos matriculados en tus cursos.</p>
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">en proceso ...</div>
      </div>
    </div>
  );
}

