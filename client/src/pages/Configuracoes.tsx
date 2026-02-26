import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useIdiomaDB as useIdioma } from '@/hooks/useIdiomaDB';
import { useCustosDB as useCustos } from '@/hooks/useCustosDB';
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
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>
      {/* Header */}
      <header className="sticky top-12 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.80 0.005 65)' }}>
          {t('configuracoes')}
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          {/* Taxa de Câmbio */}
          <div className="mb-8 p-6 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'oklch(0.80 0.005 65)' }}>
              💱 {t('taxaCambio')}
            </h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  {t('taxaCambio')}
                </label>
                <input
                  type="number"
                  value={taxaTemp}
                  onChange={e => setTaxaTemp(e.target.value)}
                  step="0.01"
                  className="w-full mt-2 px-4 py-2 rounded-md border text-lg font-mono"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
              <button
                onClick={handleSaveTaxa}
                className="px-6 py-2 rounded-md font-medium transition-colors"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                {t('salvar')}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Taxa atual: <span style={{ color: 'oklch(0.80 0.005 65)' }}>USD 1 = R$ {taxaCambio.toFixed(2)}</span>
            </p>
          </div>

          {/* Idioma */}
          <div className="mb-8 p-6 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'oklch(0.80 0.005 65)' }}>
              🌐 {t('idioma')}
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setIdioma('pt')}
                className="flex-1 px-4 py-3 rounded-md border transition-colors font-medium"
                style={{
                  background: idioma === 'pt' ? 'oklch(0.48 0.22 25)' : 'oklch(0.14 0.005 285)',
                  borderColor: idioma === 'pt' ? 'oklch(0.48 0.22 25)' : 'oklch(0.26 0.005 285)',
                  color: idioma === 'pt' ? 'white' : 'oklch(0.70 0.010 285)',
                }}
              >
                🇧🇷 {t('portugues')}
              </button>
              <button
                onClick={() => setIdioma('en')}
                className="flex-1 px-4 py-3 rounded-md border transition-colors font-medium"
                style={{
                  background: idioma === 'en' ? 'oklch(0.48 0.22 25)' : 'oklch(0.14 0.005 285)',
                  borderColor: idioma === 'en' ? 'oklch(0.48 0.22 25)' : 'oklch(0.26 0.005 285)',
                  color: idioma === 'en' ? 'white' : 'oklch(0.70 0.010 285)',
                }}
              >
                🇺🇸 {t('ingles')}
              </button>
            </div>
          </div>

          {/* Relógios */}
          <div className="p-6 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <h2 className="text-lg font-bold mb-6" style={{ color: 'oklch(0.80 0.005 65)' }}>
              🕐 Horários
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Brasil */}
              <div className="p-4 rounded-lg" style={{ background: 'oklch(0.14 0.005 285)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🇧🇷</span>
                  <div>
                    <p className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                      {t('brasil')}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                      São Paulo (GMT-3)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: 'oklch(0.48 0.22 25)' }} />
                  <p className="font-mono text-xl font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                    {horaBrasil}
                  </p>
                </div>
              </div>

              {/* China */}
              <div className="p-4 rounded-lg" style={{ background: 'oklch(0.14 0.005 285)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🇨🇳</span>
                  <div>
                    <p className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                      {t('china')}
                    </p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                      Shanghai (GMT+8)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: 'oklch(0.48 0.22 25)' }} />
                  <p className="font-mono text-xl font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>
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
