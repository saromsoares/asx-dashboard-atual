import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DollarSign, RefreshCw } from 'lucide-react';

export function ExchangeRateDisplay() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: rateData, isLoading, refetch } = trpc.cambio.getInfo.useQuery(undefined, {
    refetchInterval: 60 * 60 * 1000, // Atualizar a cada 1 hora
    staleTime: 30 * 60 * 1000, // Considerar dados obsoletos após 30 minutos
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-900 text-gray-400">
        <DollarSign className="w-4 h-4" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  const rate = rateData?.rate || 8.5;
  const lastUpdated = rateData?.timestamp ? new Date(rateData.timestamp).toLocaleTimeString('pt-BR') : 'N/A';

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-900 border border-gray-700">
      <DollarSign className="w-4 h-4 text-green-500" />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">
          USD/BRL: R$ {rate.toFixed(2)}
        </span>
        <span className="text-xs text-gray-400">
          Atualizado às {lastUpdated}
        </span>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="ml-2 p-1 rounded hover:bg-gray-800 disabled:opacity-50"
        title="Atualizar taxa de câmbio"
      >
        <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
