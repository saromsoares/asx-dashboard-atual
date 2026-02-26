import axios from 'axios';

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutos

interface CachedRate {
  rate: number;
  timestamp: number;
  source: string;
}

let cachedRate: CachedRate | null = null;

async function fetchFromOpenExchangeRates(): Promise<number | null> {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
      timeout: 8000,
    });
    if (response.data?.rates?.BRL) {
      return response.data.rates.BRL;
    }
  } catch (error) {
    console.warn('[Exchange Rate] open.er-api.com falhou:', (error as any)?.message);
  }
  return null;
}

async function fetchFromExchangeRateApi(): Promise<number | null> {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 8000,
    });
    if (response.data?.rates?.BRL) {
      return response.data.rates.BRL;
    }
  } catch (error) {
    console.warn('[Exchange Rate] exchangerate-api.com falhou:', (error as any)?.message);
  }
  return null;
}

export async function getExchangeRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION_MS) {
    return cachedRate.rate;
  }

  const sources = [
    { name: 'open.er-api.com', fn: fetchFromOpenExchangeRates },
    { name: 'exchangerate-api.com', fn: fetchFromExchangeRateApi },
  ];

  for (const source of sources) {
    const rate = await source.fn();
    if (rate && rate > 0) {
      cachedRate = { rate, timestamp: Date.now(), source: source.name };
      console.log(`[Exchange Rate] Taxa atualizada via ${source.name}: ${rate}`);
      return rate;
    }
  }

  if (cachedRate) {
    console.log('[Exchange Rate] Usando cache antigo como fallback:', cachedRate.rate);
    return cachedRate.rate;
  }

  const fallbackRate = 5.80;
  console.log('[Exchange Rate] Usando taxa padrão como fallback:', fallbackRate);
  return fallbackRate;
}

export async function convertUsdToBrl(usd: number): Promise<number> {
  const rate = await getExchangeRate();
  return usd * rate;
}

export async function getExchangeRateInfo() {
  const rate = await getExchangeRate();
  return {
    rate,
    base: 'USD',
    target: 'BRL',
    timestamp: cachedRate?.timestamp || Date.now(),
    source: cachedRate?.source || 'fallback',
  };
}

export function clearExchangeRateCache() {
  cachedRate = null;
}
