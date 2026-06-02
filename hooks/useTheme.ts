import { useEffect, useState } from 'react';

const STORAGE_KEY = 'catdecks-theme';

/**
 * Tema claro/escuro. Escuro é o padrão; aplica a classe `light` no <html>
 * e persiste a escolha no localStorage.
 */
export function useTheme() {
  const [isLight, setIsLight] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isLight) html.classList.add('light');
    else html.classList.remove('light');
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  return { isLight, toggle: () => setIsLight((l) => !l) };
}
