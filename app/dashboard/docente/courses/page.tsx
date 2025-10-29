"use client";

import { useEffect, useState } from 'react';

type Attempt = { id: string; student?: { id: string; email?: string; name?: string } | null; score?: number | null; warnings?: number; isBlocked?: boolean; startedAt?: string; completedAt?: string; answers?: any[] };
type Course = { id: string; title: string; description?: string; quizzes?: any[]; enrollments?: { id: string; studentId: string; student?: { email?: string } }[] };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<{ id: string; title: string; timeLimit?: number; maxAttempts?: number; courseId?: string } | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<Attempt[] | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseEditTitle, setCourseEditTitle] = useState('');
  const [courseEditDescription, setCourseEditDescription] = useState('');

  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [quizEditTitle, setQuizEditTitle] = useState('');
  const [quizEditTimeLimit, setQuizEditTimeLimit] = useState<number | undefined>(undefined);
  const [quizEditMaxAttempts, setQuizEditMaxAttempts] = useState<number | undefined>(undefined);
  const [quizEditQuestionsJson, setQuizEditQuestionsJson] = useState('');

  async function fetchCourses() {
    try {
      const res = await fetch('/api/courses', { credentials: 'include' });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setCourses(data);
    } catch (e: any) {
      setMessage(e.message || 'Error cargando cursos');
    }
  }

  useEffect(() => { fetchCourses(); }, []);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setMessage('Título requerido');
    setLoading(true); setMessage(null);
    try {
      const res = await fetch('/api/courses', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), description: description.trim() }) });
      if (!res.ok) throw new Error('Error creando curso');
      setTitle(''); setDescription('');
      await fetchCourses();
      setMessage('Curso creado');
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally { setLoading(false); }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollCourseId) return setMessage('Selecciona curso');
    if (!enrollEmail.trim()) return setMessage('Email requerido');
    try {
      const res = await fetch('/api/courses/enroll', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: enrollCourseId, email: enrollEmail.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error matriculando');
      setMessage(data.message || 'Alumno matriculado');
      setEnrollEmail('');
      await fetchCourses();
    } catch (err: any) { setMessage(err.message || 'Error'); }
  }

  async function openQuizDetails(quiz: any) {
    setSelectedQuiz(quiz);
    setQuizAttempts(null);
    setLoadingAttempts(true);
    try {
      const res = await fetch(`/api/attempts?quizId=${quiz.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando intentos');
      const data = await res.json();
      setQuizAttempts(data || []);
    } catch (err: any) {
      setMessage(err.message || 'Error cargando intentos');
    } finally {
      setLoadingAttempts(false);
    }
  }

  // Course edit/delete
  function openEditCourse(c: Course) {
    setEditingCourseId(c.id);
    setCourseEditTitle(c.title || '');
    setCourseEditDescription(c.description || '');
  }

  async function saveCourseEdit() {
    if (!editingCourseId) return;
    try {
      const res = await fetch('/api/courses', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: editingCourseId, title: courseEditTitle, description: courseEditDescription }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error actualizando curso');
      setMessage(j.message || 'Curso actualizado');
      setEditingCourseId(null);
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function deleteCourseConfirm(id: string) {
    if (!confirm('¿Eliminar este curso y todo su contenido? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/courses?courseId=${id}`, { method: 'DELETE', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error eliminando curso');
      setMessage(j.message || 'Curso eliminado');
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  // Quiz edit/delete
  function openEditQuiz(q: any) {
    setEditingQuiz(q);
    setQuizEditTitle(q.title || '');
    setQuizEditTimeLimit(q.timeLimit ?? undefined);
    setQuizEditMaxAttempts(q.maxAttempts ?? undefined);
    // preload questions as JSON if available
    setQuizEditQuestionsJson(JSON.stringify(q.questions ?? [], null, 2));
  }

  async function saveQuizEdit() {
    if (!editingQuiz) return;
    try {
      let body: any = { title: quizEditTitle, timeLimit: quizEditTimeLimit, maxAttempts: quizEditMaxAttempts };
      try { const parsed = JSON.parse(quizEditQuestionsJson || '[]'); body.questions = parsed; } catch (e) { /* ignore invalid json */ }
      const res = await fetch(`/api/quizzes/${editingQuiz.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error actualizando quiz');
      setMessage(j.message || 'Quiz actualizado');
      setEditingQuiz(null);
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function deleteQuizConfirm(id: string) {
    if (!confirm('¿Eliminar este quiz? Esta acción es irreversible.')) return;
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error eliminando quiz');
      setMessage(j.message || 'Quiz eliminado');
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  // Duplicate quiz: create a new quiz with same questions under chosen course
  const [duplicatingQuiz, setDuplicatingQuiz] = useState<any | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateCourseId, setDuplicateCourseId] = useState('');
  const [duplicateQuestions, setDuplicateQuestions] = useState<any[]>([]);
  const [showDuplicateQuestionsEditor, setShowDuplicateQuestionsEditor] = useState(false);

  function openDuplicateQuiz(q: any) {
    setDuplicatingQuiz(q);
    setDuplicateTitle(`Copia - ${q.title}`);
    setDuplicateCourseId(q.courseId || (courses[0] && courses[0].id) || '');
    // initialize editable questions structure (deep copy)
    const qs = (q.questions || []).map((qq: any) => ({
      text: qq.text || '',
      options: (qq.options || []).map((o: any) => ({ text: o.text || '', isCorrect: !!o.isCorrect }))
    }));
    setDuplicateQuestions(qs);
  }

  async function createDuplicateQuiz() {
    if (!duplicatingQuiz) return;
    if (!duplicateTitle.trim()) return setMessage('Título requerido');
    try {
      let questionsPayload = duplicatingQuiz.questions || [];
      if (showDuplicateQuestionsEditor) {
        // validate and use duplicateQuestions state
        questionsPayload = duplicateQuestions.map(q => ({ text: q.text, options: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })) }));
      }
      const payload: any = { title: duplicateTitle.trim(), courseId: duplicateCourseId || duplicatingQuiz.courseId, timeLimit: duplicatingQuiz.timeLimit, maxAttempts: duplicatingQuiz.maxAttempts, questions: questionsPayload };
      const res = await fetch('/api/quizzes', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error duplicando quiz');
      setMessage(j.message || 'Quiz duplicado');
      setDuplicatingQuiz(null);
      await fetchCourses();
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  function closeQuizDetails() {
    setSelectedQuiz(null);
    setQuizAttempts(null);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <a href="/dashboard/docente" className="inline-block text-sm text-gray-300 hover:underline">← Volver al panel</a>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 mb-4">Cursos</h1>

        {message && <div className="mb-4 p-3 bg-gray-800 rounded">{message}</div>}

        <section className="mb-8 bg-white/5 p-6 rounded">
          <h2 className="text-2xl font-semibold mb-4">Crear Curso</h2>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del curso" required className="w-full p-3 bg-gray-800 rounded" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full p-3 bg-gray-800 rounded" />
            <div className="text-right">
              <button disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 transition rounded">Crear Curso</button>
            </div>
          </form>
        </section>

        <section className="mb-8 bg-white/5 p-6 rounded">
          <h2 className="text-2xl font-semibold mb-4">Matricular Alumno</h2>
          <form onSubmit={handleEnroll} className="flex gap-3">
            <select value={enrollCourseId} onChange={e => setEnrollCourseId(e.target.value)} className="p-3 bg-gray-800 rounded">
              <option value="">Selecciona curso</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <input value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} placeholder="email del alumno" className="p-3 bg-gray-800 rounded flex-1" />
            <button className="px-4 py-2 bg-green-600 hover:bg-green-500 transition rounded">Matricular</button>
          </form>
        </section>

        <section className="bg-white/5 p-6 rounded">
          <h2 className="text-2xl font-semibold mb-4">Tus Cursos</h2>
          {courses.length === 0 && <p className="text-gray-400">No tienes cursos aún.</p>}
          {courses.map(c => (
            <div key={c.id} className="mb-4 p-4 bg-gray-800 rounded">
              <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold">{c.title}</h3>
                    <p className="text-sm text-gray-400">{c.description}</p>
                </div>
                  <div className="text-sm text-gray-300">Alumnos: {c.enrollments?.length ?? 0}</div>
              </div>

                {/* course edit inline */}
                {editingCourseId === c.id && (
                  <div className="mt-3 p-3 bg-gray-800 rounded">
                    <input value={courseEditTitle} onChange={e => setCourseEditTitle(e.target.value)} className="w-full p-2 bg-gray-900 rounded mb-2" />
                    <input value={courseEditDescription} onChange={e => setCourseEditDescription(e.target.value)} className="w-full p-2 bg-gray-900 rounded mb-2" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingCourseId(null); }} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Cancelar</button>
                      <button onClick={saveCourseEdit} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">Guardar</button>
                    </div>
                  </div>
                )}

                <div className="mt-3">
                <h4 className="font-semibold">Quizzes</h4>
                <ul className="mt-2 space-y-2">
                  {(c.quizzes || []).map((q: any) => (
                    <li key={q.id} className="flex justify-between items-center bg-gray-900 p-3 rounded">
                      <div>
                        <div className="font-medium">{q.title}</div>
                        <div className="text-sm text-gray-400">Tiempo: {q.timeLimit} min • Intentos: {q.maxAttempts}</div>
                      </div>
                          <div className="flex gap-2">
                            <button onClick={() => openQuizDetails(q)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">Ver notas</button>
                            <button onClick={() => openDuplicateQuiz(q)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Duplicar</button>
                            <button onClick={() => deleteQuizConfirm(q.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">Eliminar</button>
                          </div>
                    </li>
                  ))}
                </ul>
              </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEditCourse(c)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Editar curso</button>
                    <button onClick={() => deleteCourseConfirm(c.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">Eliminar curso</button>
                  </div>
            </div>
          ))}
        </section>

        {/* Quiz details modal / panel */}
        {selectedQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={closeQuizDetails} />
            <div className="relative z-10 max-w-3xl w-full bg-gray-900 text-gray-200 rounded shadow-lg overflow-auto" style={{maxHeight: '80vh'}}>
              <div className="p-4 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{selectedQuiz.title}</h3>
                  <div className="text-sm text-gray-400">Tiempo: {selectedQuiz.timeLimit} min • Intentos: {selectedQuiz.maxAttempts}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={closeQuizDetails} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded">Cerrar</button>
                </div>
              </div>
              <div className="p-4">
                {loadingAttempts && <div className="p-4">Cargando intentos...</div>}
                {!loadingAttempts && quizAttempts && quizAttempts.length === 0 && <div className="p-4 text-gray-400">No hay intentos aún.</div>}
                {!loadingAttempts && quizAttempts && quizAttempts.length > 0 && (
                  <div className="space-y-3">
                    <table className="w-full table-auto text-left text-sm">
                          <thead className="text-gray-400">
                        <tr>
                          <th className="px-2 py-2">Alumno</th>
                          <th className="px-2 py-2">Nombre</th>
                          <th className="px-2 py-2">Nota</th>
                          <th className="px-2 py-2">Correcciones</th>
                          <th className="px-2 py-2">Warnings</th>
                          <th className="px-2 py-2">Inicio</th>
                          <th className="px-2 py-2">Fin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizAttempts.map((a) => {
                          const correctCount = (a.answers || []).filter((ans: any) => ans.selectedOption?.isCorrect).length;
                          return (
                            <tr key={a.id} className="border-t border-slate-800">
                              <td className="px-2 py-2">{a.student?.email ?? a.student?.id}</td>
                              <td className="px-2 py-2">{a.student?.name ?? '-'}</td>
                              <td className="px-2 py-2">{a.score ?? '-'}</td>
                              <td className="px-2 py-2">{correctCount}</td>
                              <td className="px-2 py-2">{a.warnings ?? 0}</td>
                              <td className="px-2 py-2">{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td>
                              <td className="px-2 py-2">{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Duplicate quiz modal */}
        {duplicatingQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDuplicatingQuiz(null)} />
            <div className="relative z-10 max-w-2xl w-full bg-gray-900 text-gray-200 rounded shadow-lg overflow-auto p-4">
              <h3 className="text-lg font-bold mb-2">Duplicar Quiz</h3>
              <div className="mb-2 text-sm text-gray-400">Quiz original: {duplicatingQuiz.title}</div>
              <input value={duplicateTitle} onChange={e => setDuplicateTitle(e.target.value)} className="w-full p-2 bg-gray-800 rounded mb-2" placeholder="Título para el nuevo quiz" />
              <select value={duplicateCourseId} onChange={e => setDuplicateCourseId(e.target.value)} className="w-full p-2 bg-gray-800 rounded mb-2">
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <div className="mb-2">
                <label className="text-sm text-gray-400 mr-2">Editar preguntas antes de duplicar?</label>
                <button type="button" onClick={() => setShowDuplicateQuestionsEditor(v => !v)} className="ml-2 px-2 py-1 bg-slate-700 rounded text-sm">{showDuplicateQuestionsEditor ? 'Ocultar' : 'Editar preguntas'}</button>
              </div>
              {showDuplicateQuestionsEditor && (
                <div className="mb-2 space-y-3">
                  {duplicateQuestions.map((q, qi) => (
                    <div key={qi} className="p-3 bg-gray-800 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <input value={q.text} onChange={e => { const copy = [...duplicateQuestions]; copy[qi].text = e.target.value; setDuplicateQuestions(copy); }} placeholder={`Pregunta ${qi+1}`} className="w-full p-2 bg-gray-900 rounded" />
                        <button type="button" onClick={() => { setDuplicateQuestions(duplicateQuestions.filter((_, i) => i !== qi)); }} className="ml-2 px-2 py-1 bg-red-600 rounded">Eliminar</button>
                      </div>
                      <div className="space-y-2">
                        {(q.options || []).map((opt: any, oi: number) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`correct-${qi}`} checked={!!opt.isCorrect} onChange={() => { const copy = [...duplicateQuestions]; copy[qi].options = copy[qi].options.map((oo: any, idx: number) => ({ ...oo, isCorrect: idx === oi })); setDuplicateQuestions(copy); }} />
                            <input value={opt.text} onChange={e => { const copy = [...duplicateQuestions]; copy[qi].options[oi].text = e.target.value; setDuplicateQuestions(copy); }} className="flex-1 p-2 bg-gray-900 rounded" />
                            <button type="button" onClick={() => { const copy = [...duplicateQuestions]; copy[qi].options = copy[qi].options.filter((_, i) => i !== oi); setDuplicateQuestions(copy); }} className="px-2 py-1 bg-red-600 rounded">Eliminar</button>
                          </div>
                        ))}
                        <div>
                          <button type="button" onClick={() => { const copy = [...duplicateQuestions]; copy[qi].options = [...(copy[qi].options||[]), { text: '', isCorrect: false }]; setDuplicateQuestions(copy); }} className="px-2 py-1 bg-slate-700 rounded">Agregar opción</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <button type="button" onClick={() => setDuplicateQuestions([...duplicateQuestions, { text: '', options: [{ text: '', isCorrect: true }] }])} className="px-3 py-1 bg-green-600 rounded">Agregar pregunta</button>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setDuplicatingQuiz(null)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded">Cancelar</button>
                <button onClick={createDuplicateQuiz} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded">Crear copia</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
