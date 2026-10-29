import { useEffect, useState } from 'react';

/**
 * Atrasa a atualização de um valor até o usuário parar de mudá-lo.
 * Na busca, evita uma requisição a cada tecla: "ressonancia" vira 1
 * requisição, não 11.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
