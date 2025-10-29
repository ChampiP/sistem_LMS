"use client";

import { useEffect, useState } from 'react';

type Enrollment = { id: string; studentId: string; student?: { id: string; email?: string; name?: string } };
type Course = { id: string; title: string; enrollments?: Enrollment[] };

export default function AlumnosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { fetchCourses(); }, []);

  async function fetchCourses() {
    try {
      const res = await fetch('/api/courses', { credentials: 'include' });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setCourses(data);
    } catch (e: any) { setMessage(e.message || 'Error cargando cursos'); }
  }

  // Build student map: id -> { id, email, name, courses[] }
  const studentsMap = new Map<string, { id: string; email?: string; name?: string; courses: string[] }>();
  for (const c of courses) {
    for (const en of c.enrollments || []) {
      const sid = en.studentId || (en.student && en.student.id) || en.id;
      const email = en.student?.email;
      const name = en.student?.name;
      if (!studentsMap.has(sid)) studentsMap.set(sid, { id: sid, email, name, courses: [c.title] });
      else studentsMap.get(sid)!.courses.push(c.title);
    }
  }

  const students = Array.from(studentsMap.values());

  // actions: block and delete
  async function blockStudent(id: string) {
    if (!confirm('¿Bloquear este alumno? Esto evitará que inicie sesión.')) return;
    try {
      const res = await fetch('/api/users/block', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error bloqueando');
      setMessage(j.message || 'Alumno bloqueado');
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function unblockStudent(id: string) {
    if (!confirm('¿Desbloquear este alumno? Se generará una contraseña temporal que deberás entregar al alumno.')) return;
    try {
      const res = await fetch('/api/users/unblock', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error desbloqueando');
      const msg = j.message || 'Alumno desbloqueado';
      const temp = j.tempPassword ? ` Contraseña temporal: ${j.tempPassword}` : '';
      setMessage(msg + temp);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function deleteStudent(id: string) {
    if (!confirm('¿Eliminar este alumno y sus datos? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/users/delete?studentId=${id}`, { method: 'DELETE', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error eliminando');
      setMessage(j.message || 'Alumno eliminado');
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  // Lazy load attempts per student
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<Record<string, any[]>>({});
  const [loadingAttemptsFor, setLoadingAttemptsFor] = useState<string | null>(null);

  async function toggleStudentAttempts(id: string) {
    if (openStudentId === id) { setOpenStudentId(null); return; }
    setOpenStudentId(id);
    if (studentAttempts[id]) return;
    setLoadingAttemptsFor(id);
    try {
      const res = await fetch(`/api/attempts?studentId=${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando intentos');
      const data = await res.json();
      setStudentAttempts(prev => ({ ...prev, [id]: data }));
    } catch (err: any) { setMessage(err.message || 'Error cargando intentos'); }
    finally { setLoadingAttemptsFor(null); }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <a href="/dashboard/docente" className="inline-block text-sm text-gray-300 hover:underline">← Volver al panel</a>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 mb-4">Alumnos</h1>
        {message && <div className="mb-4 p-3 bg-gray-800 rounded">{message}</div>}

        {students.length === 0 && <p className="text-gray-400">No se encontraron alumnos matriculados.</p>}

        <ul className="space-y-3">
          {students.map(s => (
            <li key={s.id} className="p-3 bg-gray-800 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-lg">{(s.name && s.name.split(' ')[0]) ?? s.email ?? s.id} <span className="text-sm text-gray-400">{(s.name && s.name.split(' ').slice(1).join(' ')) ? (' ' + s.name.split(' ').slice(1).join(' ')) : ''}</span></div>
                  <div className="text-sm text-gray-400">Cursos: {s.courses.join(', ')}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => toggleStudentAttempts(s.id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">{openStudentId === s.id ? 'Ocultar notas' : 'Ver notas'}</button>
                    <button onClick={() => blockStudent(s.id)} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm">Bloquear</button>
                    <button onClick={() => unblockStudent(s.id)} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm">Desbloquear</button>
                                <button onClick={() => deleteStudent(s.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">Eliminar</button>
                                <button onClick={async () => {
                                  const np = prompt('Nueva contraseña para el alumno (mínimo 6 caracteres):');
                                  if (!np) return;
                                  if (np.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');
                                  try {
                                    const res = await fetch('/api/users/reset-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: s.id, newPassword: np }) });
                                    const j = await res.json();
                                    if (!res.ok) throw new Error(j.error || 'Error');
                                    setMessage(j.message || 'Contraseña actualizada');
                                  } catch (e: any) { setMessage(e.message || 'Error'); }
                                }} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Reset contraseña</button>
                  </div>
                </div>
              </div>

              {openStudentId === s.id && (
                <div className="mt-3 bg-gray-900 p-3 rounded">
                  {loadingAttemptsFor === s.id && <div className="p-2">Cargando notas...</div>}
                  {studentAttempts[s.id] && studentAttempts[s.id].length === 0 && <div className="text-gray-400">No hay intentos registrados para este alumno.</div>}
                  {studentAttempts[s.id] && studentAttempts[s.id].length > 0 && (
                    <table className="w-full table-auto text-left text-sm">
                      <thead className="text-gray-400">
                        <tr>
                          <th className="px-2 py-2">Curso</th>
                          <th className="px-2 py-2">Quiz</th>
                          <th className="px-2 py-2">Score</th>
                          <th className="px-2 py-2">Warnings</th>
                          <th className="px-2 py-2">Inicio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAttempts[s.id].map((a: any) => (
                          <tr key={a.id} className="border-t border-slate-800">
                            <td className="px-2 py-2">{a.quiz?.course?.title ?? '-'}</td>
                            <td className="px-2 py-2">{a.quiz?.title}</td>
                            <td className="px-2 py-2">{a.score ?? '-'}</td>
                            <td className="px-2 py-2">{a.warnings ?? 0}</td>
                            <td className="px-2 py-2">{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
