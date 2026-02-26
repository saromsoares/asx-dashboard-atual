import axios from 'axios';

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate.host/latest';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
  success: boolean;
  timestamp: number;
}

interface CachedRate {
  rate: number;
  timestamp: number;
}

// Cache em memória
let cachedRate: CachedRate | null = null;

/**
 * Obter taxa de câmbio USD para BRL em tempo real
 * @returns Taxa de câmbio USD → BRL
 */
export async function getExchangeRate(): Promise<number> {
  // Verificar se cache ainda é válido
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION_MS) {
    console.log('[Exchange Rate] Usando taxa em cache:', cachedRate.rate);
    return cachedRate.rate;
  }

  try {
    console.log('[Exchange Rate] Buscando taxa em tempo real...');
    const response = await axios.get<ExchangeRateResponse>(EXCHANGE_RATE_API_URL, {
      params: {
        base: 'USD',
        symbols: 'BRL',
      },
      timeout: 10000, // 10 segundos de timeout
    });

    if (!response.data.success || !response.data.rates.BRL) {
      throw new Error('Taxa de câmbio não encontrada na resposta');
    }

    const rate = response.data.rates.BRL;
    
    // Atualizar cache
    cachedRate = {
      rate,
      timestamp: Date.now(),
    };

    console.log('[Exchange Rate] Taxa atualizada:', rate);
    return rate;
  } catch (error) {
    console.error('[Exchange Rate] Erro ao buscar taxa:', error);
    
    // Se houver erro e temos cache antigo, usar mesmo que expirado
    if (cachedRate) {
      console.log('[Exchange Rate] Usando cache antigo como fallback:', cachedRate.rate);
      return cachedRate.rate;
    }

    // Se não houver cache, usar valor padrão
    const fallbackRate = 8.5;
    console.log('[Exchange Rate] Usando taxa padrão como fallback:', fallbackRate);
    return fallbackRate;
  }
}

/**
 * Converter USD para BRL
 * @param usd Valor em dólares
 * @returns Valor em reais
 */
export async function convertUsdToBrl(usd: number): Promise<number> {
  const rate = await getExchangeRate();
  return usd * rate;
}

/**
 * Obter informações detalhadas da taxa de câmbio
 */
export async function getExchangeRateInfo() {
  const rate = await getExchangeRate();
  return {
    rate,
    base: 'USD',
    target: 'BRL',
    timestamp: cachedRate?.timestamp || Date.now(),
    source: 'exchangerate.host',
  };
}

/**
 * Limpar cache (útil para testes)
 */
export function clearExchangeRateCache() {
  cachedRate = null;
}
