import Navbar from '../../_components/Navbar';
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTimer } from '@/lib/hooks/useTimer';
import { useQuizAntiCheat } from '@/lib/hooks/useQuizAntiCheat';

export default function QuizPage() {
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
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<any | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => { fetchQuiz(); }, [quizId]);

  async function fetchQuiz() {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Quiz no encontrado');
      const data = await res.json();
      setQuiz(data);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  async function startAttempt() {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/start`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('No puedes iniciar este quiz');
      const data = await res.json();
      setAttemptId(data.attemptId);
      setStarted(true);
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  function selectOption(questionId: string, optionId: string) {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }

  async function submitQuiz() {
    if (!attemptId) {
      setMessage('No hay intento activo');
      return;
    }
    if (!started) {
      setMessage('El quiz no ha sido iniciado correctamente.');
      return;
    }
    if (typeof timeRemaining !== 'undefined' && timeRemaining <= 0) {
      setMessage('Tiempo agotado. No se puede enviar.');
      return;
    }
    // validar que respondió todas las preguntas
    if (!quiz) { setMessage('Quiz no cargado'); return; }
    const totalQuestions = quiz.questions.length;
    if (Object.keys(answers).length < totalQuestions) {
      setMessage('Debes responder todas las preguntas antes de enviar.');
      return;
    }

    // prepare payload
    const payload = Object.entries(answers).map(([qId, optId]) => ({ questionId: qId, selectedOptionId: optId }));
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      // server returns nota (0..20) and scorePercent; show nota
      setMessage(`Enviado. Nota: ${data.nota ?? '-'} /20`);
      router.push('/dashboard/alumno');
    } catch (e: any) { setMessage(e.message || 'Error'); }
  }

  // timer and anti-cheat
  const durationSeconds = (quiz?.timeLimit || 0) * 60;
  const { timeRemaining, formattedTime } = useTimer({ duration: durationSeconds, onTimeUp: () => { setMessage('Tiempo agotado'); submitQuiz(); }, active: started });

  // anti-cheat: on visibility change consume attempt (leave)
  useQuizAntiCheat({ onWarning: async (count) => {
    setMessage(`Advertencia ${count}`);
    // first leave consumes the attempt
    if (count >= 1 && attemptId) {
      try {
        await fetch(`/api/quizzes/${quizId}/event`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'leave' }) });
        setMessage('Has salido de la pestaña. Intento consumido.');
        setStarted(false);
      } catch (e) { console.error(e); }
    }
  }, onBlock: () => setMessage('Bloqueado por trampa') });

  // prevent copy/select while started and warn on unload
  useEffect(() => {
    if (!started) return;
    const prevent = (e: Event) => { e.preventDefault(); };
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', prevent);
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('selectstart', prevent);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [started]);

  // if autostart query param is present, start the attempt as soon as quiz metadata is loaded
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      const auto = searchParams?.get('autostart');
      if (auto && quiz && !started) {
        // start immediately
        startAttempt();
      }
    } catch (e) { /* ignore */ }
  }, [searchParams, quiz]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
      <div className="max-w-3xl mx-auto">
        <Navbar name={profile?.name ?? null} />
        <div className="mb-4"><a href="/dashboard/alumno" className="text-sm text-gray-300 hover:underline">← Volver</a></div>
        {message && <div className="mb-4 p-3 bg-gray-800 rounded">{message}</div>}
        {quiz ? (
          <div className="bg-gray-800 p-4 rounded">
            <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
            <div className="text-sm text-gray-400 mb-4">Tiempo: {quiz.timeLimit} min • Intentos: {quiz.maxAttempts}</div>

            {!started && (
              <div className="text-center py-8">
                <p className="mb-4 text-gray-300">El quiz iniciará en una página protegida. Presiona <strong>Iniciar</strong> </p>
                <div className="text-sm text-gray-300 mb-4">Tiempo: {quiz.timeLimit} minutos</div>
                <div className="flex justify-center">
                  <button onClick={startAttempt} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded">Iniciar</button>
                </div>
              </div>
            )}

            {started && (
              <>
                {quiz.questions.map((q: any) => (
                  <div key={q.id} className="mb-4">
                    <div className="font-medium mb-2">{q.text}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options.map((o: any) => (
                        <button key={o.id} onClick={() => selectOption(q.id, o.id)} className={`p-3 text-left rounded ${answers[q.id] === o.id ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                          {o.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-300">Tiempo restante: {formattedTime}</div>
                  <div className="flex gap-2">
                    <button onClick={submitQuiz} disabled={timeRemaining <= 0} className={`px-3 py-1 rounded ${timeRemaining <= 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}>
                      Enviar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : <div className="text-gray-400">Cargando quiz...</div>}
      </div>
    </div>
  );
}
