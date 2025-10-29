"use client";

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, User, ArrowLeft, Star, Clock } from 'lucide-react';

type Attempt = { id: string; student: { id: string; email?: string } | null; quiz: { id: string; title: string; courseId?: string }; score?: number | null; warnings?: number; isBlocked?: boolean; startedAt?: string; completedAt?: string; };
type Course = { id: string; title: string; quizzes?: { id: string; title: string }[] };

export default function GradesPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | 'all'>('all');
  const [selectedQuiz, setSelectedQuiz] = useState<string | 'all'>('all');

  useEffect(() => {
    // fetch both datasets
    Promise.all([
      fetch('/api/attempts', { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then((j:any)=>Promise.reject(j.error||'No auth'))),
      fetch('/api/courses', { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then((j:any)=>Promise.reject(j.error||'No auth'))),
    ]).then(([a, c]) => {
      setAttempts(a);
      setCourses(c);
    }).catch(e => setMessage(String(e)));
  }, []);

  // compute quizzes for the selected course
  const quizzesForCourse = useMemo(() => {
    if (selectedCourse === 'all') return ([] as {id:string;title:string}[]);
    const course = courses.find(cs => cs.id === selectedCourse as string);
    return course?.quizzes ?? [];
  }, [selectedCourse, courses]);

  // Filter attempts by course and quiz selections
  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      if (selectedCourse !== 'all' && a.quiz.courseId !== selectedCourse) return false;
      if (selectedQuiz !== 'all' && a.quiz.id !== selectedQuiz) return false;
      return true;
    });
  }, [attempts, selectedCourse, selectedQuiz]);

  // Group by quiz -> student
  const byQuiz = useMemo(() => {
    const map = new Map<string, { quizTitle: string; rows: Attempt[] }>();
    for (const a of filteredAttempts) {
      const qid = a.quiz.id;
      if (!map.has(qid)) map.set(qid, { quizTitle: a.quiz.title, rows: [a] });
      else map.get(qid)!.rows.push(a);
    }
    return map;
  }, [filteredAttempts]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <a href="/dashboard/docente" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:underline"><ArrowLeft size={16}/> Volver</a>
          <h1 className="text-3xl font-extrabold text-amber-300 flex items-center gap-3"><BookOpen size={22}/> Notas y Intentos</h1>
        </div>

        {message && <div className="mb-4 p-3 bg-rose-800 text-rose-100 rounded">{message}</div>}

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900 p-3 rounded flex items-center gap-2">
            <ClipboardList className="text-slate-300" />
            <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value as any); setSelectedQuiz('all'); }} className="bg-transparent flex-1 p-2">
              <option value="all">Todos los cursos</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className="bg-slate-900 p-3 rounded flex items-center gap-2">
            <User className="text-slate-300" />
            <select value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value as any)} className="bg-transparent flex-1 p-2">
              <option value="all">Todos los quizzes</option>
              {quizzesForCourse.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </div>

          <div className="bg-slate-900 p-3 rounded flex items-center justify-end gap-3">
            <div className="text-sm text-slate-400">Resultados: <span className="font-medium text-white">{filteredAttempts.length}</span></div>
          </div>
        </div>

        {/* Per-quiz tables */}
        <div className="space-y-6">
          {Array.from(byQuiz.entries()).map(([qid, info]) => (
            <div key={qid} className="bg-slate-900/60 p-4 rounded border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="text-amber-400" />
                  <div>
                    <div className="font-semibold text-lg">{info.quizTitle}</div>
                    <div className="text-sm text-slate-400">Intentos: {info.rows.length}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-300">Promedio: { (info.rows.reduce((s, r) => s + (r.score ?? 0), 0) / Math.max(1, info.rows.length)).toFixed(1) } pts</div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full table-auto text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-2 py-2">Alumno</th>
                      <th className="px-2 py-2">Nota</th>
                      <th className="px-2 py-2">Warnings</th>
                      <th className="px-2 py-2">Bloqueado</th>
                      <th className="px-2 py-2">Inicio</th>
                      <th className="px-2 py-2">Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.rows.map(a => (
                      <tr key={a.id} className="border-t border-slate-700">
                        <td className="px-2 py-3">{a.student?.email ?? a.student?.id ?? 'Anónimo'}</td>
                        <td className="px-2 py-3"><span className="inline-flex items-center gap-2"><Clock size={14}/> {a.score ?? '-'}</span></td>
                        <td className="px-2 py-3">{a.warnings ?? 0}</td>
                        <td className="px-2 py-3">{a.isBlocked ? 'Sí' : 'No'}</td>
                        <td className="px-2 py-3">{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td>
                        <td className="px-2 py-3">{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {byQuiz.size === 0 && <div className="p-6 bg-slate-900 rounded text-slate-400">No hay intentos para las selecciones actuales.</div>}
        </div>
      </div>
    </div>
  );
}
