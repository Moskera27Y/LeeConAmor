import { useEffect, useRef } from 'react';

const SELECTOR_ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocoAtrapado(activo: boolean, alCerrar: () => void) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const previo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activo) return;
    previo.current = document.activeElement as HTMLElement | null;
    const nodo = contenedor.current;
    document.body.style.overflow = 'hidden';

    const enfocables = () => {
      if (!nodo) return [] as HTMLElement[];
      return [...nodo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)].filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );
    };

    const primero = enfocables()[0];
    if (primero) primero.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        alCerrar();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = enfocables();
      if (lista.length === 0) return;
      const inicial = lista[0];
      const final = lista[lista.length - 1];
      const actual = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (actual === inicial || !nodo?.contains(actual)) {
          e.preventDefault();
          final.focus();
        }
        return;
      }
      if (actual === final || !nodo?.contains(actual)) {
        e.preventDefault();
        inicial.focus();
      }
    };

    document.addEventListener('keydown', alTeclear, true);
    return () => {
      document.removeEventListener('keydown', alTeclear, true);
      document.body.style.overflow = '';
      previo.current?.focus?.();
    };
  }, [activo, alCerrar]);

  return contenedor;
}
