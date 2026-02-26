/**
 * Hook useIdiomaDB — Gerenciamento de idioma com persistência no banco de dados
 * Usa tRPC config_json para armazenar preferência de idioma
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { translations, TranslationKey } from '../locales/translations';
import { trpc } from '@/lib/trpc';

export type Idioma = 'pt' | 'en';

const CONFIG_KEY = 'asx_idioma';

export function useIdiomaDB() {
  const [idioma, setIdiomaState] = useState<Idioma>('pt');
  const { data: configDB } = trpc.dados.getConfig.useQuery({ chave: CONFIG_KEY });
  const setConfigMut = trpc.dados.setConfig.useMutation();
  const utils = trpc.useUtils();
  const dbLoaded = useRef(false);

  // Carregar idioma do banco de dados
  useEffect(() => {
    if (configDB && configDB.dados && !dbLoaded.current) {
      const saved = configDB.dados as Idioma;
      if (saved === 'pt' || saved === 'en') {
        setIdiomaState(saved);
        dbLoaded.current = true;
      }
    }
  }, [configDB]);

  // Função para mudar idioma e persistir no banco
  const setIdioma = useCallback((novoIdioma: Idioma) => {
    setIdiomaState(novoIdioma);
    setConfigMut.mutate({ chave: CONFIG_KEY, dados: novoIdioma }, {
      onSuccess: () => utils.dados.getConfig.invalidate({ chave: CONFIG_KEY }),
    });
  }, [setConfigMut, utils]);

  // Função de tradução
  const t = (key: TranslationKey): string => {
    return translations[idioma][key] || translations.pt[key] || key;
  };

  return { idioma, setIdioma, t };
}
