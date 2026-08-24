import { useEffect, useRef } from 'react';

export function useManagedTimers() {
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current = timers.current.filter((item) => item !== timer);
      callback();
    }, delay);
    timers.current.push(timer);
  };
}
