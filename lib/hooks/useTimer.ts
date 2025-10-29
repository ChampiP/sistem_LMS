'use client';

import { useState, useEffect } from 'react';

interface UseTimerProps {
  duration: number; // Duración en segundos
  onTimeUp: () => void;
  active?: boolean;
}

export const useTimer = ({ duration, onTimeUp, active = true }: UseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (!active) return;

    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      setTimeRemaining((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeRemaining, onTimeUp, active]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
  };
};
