"use client";

import { useRouter } from 'next/navigation';
import React from 'react';

export default function Navbar({ name }: { name?: string | null }) {
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
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="text-sm text-gray-400">Alumno</div>
        <div className="text-lg font-semibold">{name ?? 'Usuario'}</div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleLogout} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">Cerrar sesión</button>
      </div>
    </div>
  );
}
