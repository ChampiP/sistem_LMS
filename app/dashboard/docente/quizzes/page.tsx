"use client";

import { useEffect, useState } from 'react';

type Option = { id: string; text: string; isCorrect?: boolean };
type Question = { id: string; text: string; options: Option[] };
type Course = { id: string; title: string };

function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9); }

export default function QuizzesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([{ id: uid('q_'), text: '', options: [{ id: uid('o_'), text: '' }, { id: uid('o_'), text: '' }] }]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetch('/api/courses', { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject('no auth')).then(setCourses as any).catch(e => setMessage(String(e))); }, []);

  function addQuestion() {
    setQuestions(qs => [...qs, { id: uid('q_'), text: '', options: [{ id: uid('o_'), text: '' }, { id: uid('o_'), text: '' }] }]);
  }
  function removeQuestion(id: string) { setQuestions(qs => qs.filter(q => q.id !== id)); }

  function addOption(qid: string) { setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: [...q.options, { id: uid('o_'), text: '' }] } : q)); }
  function removeOption(qid: string, oid: string) { setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: q.options.filter(o => o.id !== oid) } : q)); }

  function setQuestionText(qid: string, text: string) { setQuestions(qs => qs.map(q => q.id === qid ? { ...q, text } : q)); }
  function setOptionText(qid: string, oid: string, text: string) { setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o) } : q)); }
  function toggleCorrect(qid: string, oid: string) { setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o) } : q)); }

  function validate() {
    if (!title.trim()) return 'Título requerido';
    if (!courseId) return 'Selecciona un curso';
    if (questions.length === 0) return 'Añade al menos una pregunta';
    for (const q of questions) {
      if (!q.text.trim()) return 'Cada pregunta necesita texto';
      if (!q.options || q.options.length < 2) return 'Cada pregunta necesita al menos 2 opciones';
      if (!q.options.some(o => o.isCorrect)) return 'Cada pregunta necesita al menos una opción correcta';
      for (const o of q.options) if (!o.text.trim()) return 'Todas las opciones necesitan texto';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const err = validate();
    if (err) return setMessage(err);
    const payload = {
      title: title.trim(),
      courseId,
      timeLimit: Number(timeLimit),
      maxAttempts: Number(maxAttempts),
      questions: questions.map(q => ({ text: q.text.trim(), options: q.options.map(o => ({ text: o.text.trim(), isCorrect: !!o.isCorrect })) }))
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/quizzes', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando quiz');
      setMessage('Quiz creado correctamente');
      // reset form
      setTitle(''); setCourseId(''); setTimeLimit(10); setMaxAttempts(1);
      setQuestions([{ id: uid('q_'), text: '', options: [{ id: uid('o_'), text: '' }, { id: uid('o_'), text: '' }] }]);
    } catch (err: any) { setMessage(err.message || 'Error'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <a href="/dashboard/docente" className="inline-block text-sm text-gray-300 hover:underline">← Volver al panel</a>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 mb-4">Crear Quiz</h1>

        {message && <div className="mb-4 p-3 bg-gray-800 rounded">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-6 rounded">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del quiz" className="p-3 bg-gray-800 rounded md:col-span-2" />
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="p-3 bg-gray-800 rounded">
              <option value="">Selecciona curso</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-2"><span className="text-sm text-gray-400">Tiempo (min)</span>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="p-2 bg-gray-800 rounded w-24" /></label>
            <label className="flex items-center gap-2"><span className="text-sm text-gray-400">Intentos</span>
              <input type="number" value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className="p-2 bg-gray-800 rounded w-24" /></label>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Preguntas</h2>
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={q.id} className="p-4 bg-gray-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">Pregunta {qi + 1}</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => addOption(q.id)} className="px-2 py-1 bg-blue-600 rounded text-sm">+ Opción</button>
                      <button type="button" onClick={() => removeQuestion(q.id)} className="px-2 py-1 bg-red-600 rounded text-sm">Eliminar</button>
                    </div>
                  </div>
                  <input value={q.text} onChange={e => setQuestionText(q.id, e.target.value)} placeholder="Texto de la pregunta" className="w-full p-2 bg-gray-700 rounded mb-2" />
                  <div className="space-y-2">
                    {q.options.map(o => (
                      <div key={o.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!o.isCorrect} onChange={() => toggleCorrect(q.id, o.id)} className="w-4 h-4" />
                        <input value={o.text} onChange={e => setOptionText(q.id, o.id, e.target.value)} placeholder="Texto de la opción" className="flex-1 p-2 bg-gray-700 rounded" />
                        <button type="button" onClick={() => removeOption(q.id, o.id)} className="px-2 py-1 bg-red-600 rounded text-sm">Eliminar</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <button type="button" onClick={addQuestion} className="px-4 py-2 bg-green-600 hover:bg-green-500 transition rounded">Añadir Pregunta</button>
            </div>
          </div>

          <div className="text-right">
            <button disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 transition rounded">Crear Quiz</button>
          </div>
        </form>
      </div>
    </div>
  );
}
