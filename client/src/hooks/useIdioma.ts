import { useState, useEffect } from 'react';
import { translations, TranslationKey } from '../locales/translations';

export type Idioma = 'pt' | 'en';

export function useIdioma() {
  const [idioma, setIdiomaState] = useState<Idioma>(() => {
    const saved = localStorage.getItem('asx_idioma');
    return (saved as Idioma) || 'pt';
  });

  useEffect(() => {
    localStorage.setItem('asx_idioma', idioma);
  }, [idioma]);

  const t = (key: TranslationKey): string => {
    return translations[idioma][key] || translations.pt[key] || key;
  };

  return { idioma, setIdioma: setIdiomaState, t };
}
