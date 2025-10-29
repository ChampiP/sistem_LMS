import prisma from '@/lib/prisma';
import React from 'react';

export const revalidate = 0; // always fresh

export default async function AdminPage() {
  const attempts = await prisma.quizAttempt.findMany({
    include: {
      student: true,
      quiz: true,
      answers: {
        include: { selectedOption: true },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 200,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin - Intentos de Quiz</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto bg-white rounded-md overflow-hidden">
          <thead className="bg-gray-100">
              <tr>
              <th className="px-4 py-2 text-left">Alumno</th>
              <th className="px-4 py-2 text-left">Quiz</th>
              <th className="px-4 py-2">Nota</th>
              <th className="px-4 py-2">Warnings</th>
              <th className="px-4 py-2">Bloqueado</th>
              <th className="px-4 py-2">Inicio</th>
              <th className="px-4 py-2">Fin</th>
              <th className="px-4 py-2">Respuestas</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3">{a.student?.email}</td>
                <td className="px-4 py-3">{a.quiz?.title}</td>
                <td className="px-4 py-3 text-center">{a.score ?? '-'}</td>
                <td className="px-4 py-3 text-center">{a.warnings}</td>
                <td className="px-4 py-3 text-center">{a.isBlocked ? 'Sí' : 'No'}</td>
                <td className="px-4 py-3">{a.startedAt?.toISOString()}</td>
                <td className="px-4 py-3">{a.completedAt ? a.completedAt.toISOString() : '-'}</td>
                <td className="px-4 py-3">
                  <ul className="list-disc pl-5">
                    {a.answers.map((ans) => (
                      <li key={ans.id}>
                        Q:{ans.questionId} → Option:{ans.selectedOptionId}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
