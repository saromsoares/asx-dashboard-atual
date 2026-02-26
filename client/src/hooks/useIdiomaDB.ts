/**
 * Hook useIdiomaDB — Gerenciamento de idioma com persistência em localStorage
 * Mantém compatibilidade com interface anterior
 * 
 * Nota: Idioma é uma preferência de UI, não requer persistência em banco de dados
 * Mantém localStorage para performance (sem latência de rede)
 */

import { useState, useEffect, useCallback } from 'react';
import { translations, TranslationKey } from '../locales/translations';

export type Idioma = 'pt' | 'en';

export function useIdiomaDB() {
  const [idioma, setIdiomaState] = useState<Idioma>(() => {
    const saved = localStorage.getItem('asx_idioma');
    return (saved as Idioma) || 'pt';
  });

  // Persistir idioma no localStorage (sem latência de rede)
  useEffect(() => {
    localStorage.setItem('asx_idioma', idioma);
  }, [idioma]);

  // Função para mudar idioma
  const setIdioma = useCallback((novoIdioma: Idioma) => {
    setIdiomaState(novoIdioma);
  }, []);

  // Função de tradução
  const t = (key: TranslationKey): string => {
    return translations[idioma][key] || translations.pt[key] || key;
  };

  return { idioma, setIdioma, t };
}
