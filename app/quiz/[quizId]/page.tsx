'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuizAntiCheat } from '../../../lib/hooks/useQuizAntiCheat';
import { useTimer } from '../../../lib/hooks/useTimer';

// --- Tipos de Datos ---
type QuizStatus = 'loading' | 'active' | 'blocked' | 'finished' | 'error';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface QuizData {
  id: string;
  title: string;
  timeLimit: number;
  maxAttempts?: number;
  questions: Question[];
}

interface SelectedAnswers {
  [questionId: string]: string;
}

// --- Componentes de UI (Overlay, Alertas, etc.) ---
const FullScreenOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full">{children}</div>
  </div>
);

const LoadingSpinner = () => (
  <FullScreenOverlay>
    <h2 className="text-2xl font-bold text-gray-800">Cargando Quiz...</h2>
  </FullScreenOverlay>
);

const BlockOverlay = () => (
  <FullScreenOverlay>
    <h2 className="text-3xl font-bold text-red-600 mb-4">Quiz Bloqueado</h2>
    <p className="text-gray-700 text-lg">Has excedido el número máximo de advertencias.</p>
    <p className="text-gray-700 mt-2">Tu intento ha sido anulado. Contacta a tu docente.</p>
  </FullScreenOverlay>
);

const FinishedOverlay = ({ score }: { score: number | null }) => (
    <FullScreenOverlay>
        <h2 className="text-3xl font-bold text-blue-600 mb-4">Quiz Finalizado</h2>
        <p className="text-gray-700 text-lg">Tu calificación es:</p>
    <p className="text-6xl font-bold text-gray-800 my-4">{score ?? '-'} /20</p>
        <p className="text-gray-600">Ya puedes cerrar esta ventana.</p>
    </FullScreenOverlay>
);

const ErrorDisplay = ({ message }: { message: string }) => (
    <FullScreenOverlay>
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700">{message}</p>
    </FullScreenOverlay>
);

const WarningAlert = ({ count }: { count: number }) => {
  if (count === 0) return null;
  const message = count === 1 ? "1ra advertencia: No salgas de la pestaña o el quiz se bloqueará." : `Advertencia ${count}: A la 3ra se bloqueará.`;
  const color = count > 1 ? 'bg-red-100 border-red-500 text-red-700' : 'bg-yellow-100 border-yellow-500 text-yellow-700';
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 p-4 border rounded-lg shadow-lg z-50 ${color}`} role="alert">
      <strong className="font-bold">¡Atención! </strong>
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

// --- Página Principal del Quiz ---
export default function QuizPage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const [status, setStatus] = useState<QuizStatus>('loading');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitQuiz = useCallback(async () => {
    if (status !== 'active') return;

    // Validar que respondió todas las preguntas
    if (!quizData) return;
    const totalQuestions = quizData.questions.length;
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      setError('Debes responder todas las preguntas antes de entregar.');
      return;
    }

    const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }));

    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answersPayload),
      });

      if (!res.ok) throw new Error('Error al entregar el quiz.');
      
  const result = await res.json();
  // server returns nota (0..20)
  setFinalScore(result.nota ?? result.score ?? null);
      setStatus('finished');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setStatus('error');
    }
  }, [quizId, selectedAnswers, status]);

  const { formattedTime } = useTimer({
    duration: quizData?.timeLimit ? quizData.timeLimit * 60 : 0,
    onTimeUp: handleSubmitQuiz,
    active: status === 'active',
  });

  const handleBlock = useCallback(() => setStatus('blocked'), []);

  const handleWarning = useCallback(async (count: number) => {
    setWarningCount(count);
    try {
      // On first leave/visibility change, consume the attempt (leave) which marks it completed with score 0
      const eventType = count >= 1 ? 'leave' : 'warning';
      await fetch(`/api/quizzes/${quizId}/event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventType }),
      });
    } catch (err) {
      console.error("Failed to record warning event", err);
    }
    // If they left, we should block UI
    if (count >= 1) {
      setStatus('blocked');
    }
  }, [quizId]);

  useQuizAntiCheat({ onWarning: handleWarning, onBlock: handleBlock, maxWarnings: 3 });

  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        // 1. Obtener datos del quiz (solo metadata, sin iniciar intento)
        const quizRes = await fetch(`/api/quizzes/${quizId}`, { credentials: 'include' });
        if (!quizRes.ok) {
            const errorData = await quizRes.json();
            throw new Error(errorData.error || 'No se pudo cargar el quiz.');
        }
        const data: QuizData = await quizRes.json();
        setQuizData(data);
        setStatus('active' in data && false ? 'active' : 'loading');
        // stay in a ready state until user clicks Iniciar
        setStatus('loading');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setStatus('error');
      }
    };
    initializeQuiz();
  }, [quizId]);

  // Start attempt when user presses Iniciar
  const startAttempt = useCallback(async () => {
    try {
      const attemptRes = await fetch(`/api/quizzes/${quizId}/start`, { method: 'POST', credentials: 'include' });
      if (!attemptRes.ok) {
        const err = await attemptRes.json();
        throw new Error(err.error || 'No se pudo iniciar el intento.');
      }
      const { attemptId } = await attemptRes.json();
      setAttemptId(attemptId);
      setStatus('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar intento');
      setStatus('error');
    }
  }, [quizId]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  // --- Renderizado condicional según el estado ---
  if (status === 'loading') return <LoadingSpinner />;
  if (status === 'blocked') return <BlockOverlay />;
  if (status === 'finished') return <FinishedOverlay score={finalScore} />;
  if (status === 'error' || !quizData) return <ErrorDisplay message={error || 'No se encontraron datos del quiz.'} />;

  // prevent copy/select/contextmenu while active
  useEffect(() => {
    if (status !== 'active') return;
    const prevent = (e: Event) => { e.preventDefault(); };
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', prevent);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('selectstart', prevent);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [status]);

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <WarningAlert count={warningCount} />

      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md sticky top-4 z-10">
        <h1 className="text-2xl font-bold text-gray-800">{quizData.title}</h1>
        <div className="text-2xl font-mono bg-gray-900 text-white px-4 py-2 rounded-lg shadow-md">
          {status === 'active' ? formattedTime : `${quizData.timeLimit} min`}
        </div>
      </header>

      <main className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
        {status !== 'active' && (
          <div className="text-center py-12">
            <p className="mb-4 text-lg text-gray-700">Curso: {quizData.title}</p>
            <p className="mb-4 text-gray-600">Tiempo: {quizData.timeLimit} minutos</p>
            <p className="mb-4 text-gray-600">Intentos permitidos: {quizData.maxAttempts ?? '-'}</p>
            <button onClick={() => startAttempt()} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg">Iniciar</button>
          </div>
        )}

        {status === 'active' && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(); }}>
            {quizData.questions.map((q, index) => (
              <div key={q.id} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Pregunta {index + 1} de {quizData.questions.length}</h2>
                <p className="text-lg text-gray-800 mb-4">{q.text}</p>
                <div className="space-y-3">
                  {q.options.map(opt => (
                    <label key={opt.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`question-${q.id}`} 
                        value={opt.id}
                        checked={selectedAnswers[q.id] === opt.id}
                        onChange={() => handleAnswerChange(q.id, opt.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700">{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="text-right mt-10">
              <button type="submit" className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:bg-gray-400">
                Entregar Quiz
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
