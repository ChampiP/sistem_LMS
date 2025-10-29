'use client';

import { useEffect, useRef } from 'react';

interface UseQuizAntiCheatProps {
  onWarning: (count: number) => void;
  onBlock: () => void;
  maxWarnings?: number;
}

export const useQuizAntiCheat = ({
  onWarning,
  onBlock,
  maxWarnings = 3,
}: UseQuizAntiCheatProps) => {
  const warningCountRef = useRef(0);
  const isBlockedRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isBlockedRef.current) {
        warningCountRef.current += 1;
        const currentWarnings = warningCountRef.current;

        onWarning(currentWarnings);

        if (currentWarnings >= maxWarnings) {
          isBlockedRef.current = true;
          onBlock();
        }
      }
    };

    const preventClipboardActions = (e: ClipboardEvent) => {
      e.preventDefault();
      // Opcional: mostrar una pequeña alerta o simplemente bloquear en silencio
      console.warn('La acción de copiar/pegar está deshabilitada durante el quiz.');
    };

    // Detectar cambio de pestaña/ventana
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange); // Fallback para algunos navegadores

    // Bloquear copiar, pegar y cortar
    document.addEventListener('copy', preventClipboardActions);
    document.addEventListener('paste', preventClipboardActions);
    document.addEventListener('cut', preventClipboardActions);

    // Limpieza al desmontar el componente
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      document.removeEventListener('copy', preventClipboardActions);
      document.removeEventListener('paste', preventClipboardActions);
      document.removeEventListener('cut', preventClipboardActions);
    };
  }, [onWarning, onBlock, maxWarnings]);
};