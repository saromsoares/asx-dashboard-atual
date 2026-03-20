import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useIdioma } from '@/hooks/useIdioma';
import { useCustos } from '@/hooks/useCustos';
import { Clock, ArrowLeft } from 'lucide-react';

export default function Configuracoes() {
  const [, setLocation] = useLocation();
  const { idioma, setIdioma, t } = useIdioma();
  const { taxaCambio, setTaxaCambio } = useCustos();
  const [horaBrasil, setHoraBrasil] = useState('');
  const [horaChina, setHoraChina] = useState('');
  const [taxaTemp, setTaxaTemp] = useState(taxaCambio.toString());

  // Atualizar relógios a cada segundo
  useEffect(() => {
    const updateTime = () => {
      // Brasil (GMT-3)
      const brTime = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // China (GMT+8)
      const cnTime = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setHoraBrasil(brTime);
      setHoraChina(cnTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveTaxa = () => {
    const newTaxa = parseFloat(taxaTemp);
    if (!isNaN(newTaxa) && newTaxa > 0) {
      setTaxaCambio(newTaxa);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'var(--color-asx-border-subtle)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>
      {/* Header */}
      <header className="sticky top-12 z-40 border-b px-6 py-4" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
        <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'var(--color-asx-text-heading)' }}>
          {t('configuracoes')}
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          {/* Taxa de Câmbio */}
          <div className="mb-8 p-6 rounded-lg border" style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
              💱 {t('taxaCambio')}
            </h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm" style={{ color: 'var(--color-asx-text-secondary)' }}>
                  {t('taxaCambio')}
                </label>
                <input
                  type="number"
                  value={taxaTemp}
                  onChange={e => setTaxaTemp(e.target.value)}
                  step="0.01"
                  className="w-full mt-2 px-4 py-2 rounded-md border text-lg font-mono"
                  style={{
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
              </div>
              <button
                onClick={handleSaveTaxa}
                className="px-6 py-2 rounded-md font-medium transition-colors"
                style={{ background: 'var(--color-asx-red)', color: 'white' }}
              >
                {t('salvar')}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Taxa atual: <span style={{ color: 'var(--color-asx-text-heading)' }}>USD 1 = R$ {taxaCambio.toFixed(2)}</span>
            </p>
          </div>

          {/* Idioma */}
          <div className="mb-8 p-6 rounded-lg border" style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
              🌐 {t('idioma')}
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setIdioma('pt')}
                className="flex-1 px-4 py-3 rounded-md border transition-colors font-medium"
                style={{
                  background: idioma === 'pt' ? 'var(--color-asx-red)' : 'var(--color-asx-base)',
                  borderColor: idioma === 'pt' ? 'var(--color-asx-red)' : 'var(--color-asx-border)',
                  color: idioma === 'pt' ? 'white' : 'var(--color-asx-text-secondary)',
                }}
              >
                🇧🇷 {t('portugues')}
              </button>
              <button
                onClick={() => setIdioma('en')}
                className="flex-1 px-4 py-3 rounded-md border transition-colors font-medium"
                style={{
                  background: idioma === 'en' ? 'var(--color-asx-red)' : 'var(--color-asx-base)',
                  borderColor: idioma === 'en' ? 'var(--color-asx-red)' : 'var(--color-asx-border)',
                  color: idioma === 'en' ? 'white' : 'var(--color-asx-text-secondary)',
                }}
              >
                🇺🇸 {t('ingles')}
              </button>
            </div>
          </div>

          {/* Relógios */}
          <div className="p-6 rounded-lg border" style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}>
            <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--color-asx-text-heading)' }}>
              🕐 Horários
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Brasil */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--color-asx-base)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🇧🇷</span>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-asx-text-secondary)' }}>
                      {t('brasil')}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                      São Paulo (GMT-3)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: 'var(--color-asx-red)' }} />
                  <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>
                    {horaBrasil}
                  </p>
                </div>
              </div>

              {/* China */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--color-asx-base)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🇨🇳</span>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-asx-text-secondary)' }}>
                      {t('china')}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                      Shanghai (GMT+8)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: 'var(--color-asx-red)' }} />
                  <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>
                    {horaChina}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
