import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';

export const FUTARCHY_SPACES = [
  'kleros.eth',
  'paraswap-dao.eth',
  'gnosis.eth',
  'aavedao.eth'
];

const FUTARCHY_API_URL = 'https://api.futarchy.fi/charts';

interface FutarchyMarket {
  trading_address?: string;
  conditional_yes: { price_usd: number };
  conditional_no: { price_usd: number };
  spot: { price_usd: number | null };
  company_tokens: { base: { tokenSymbol: string } };
  timeline?: { price_precision?: number; currency_rate?: number };
}

type Candle = { periodStartUnix: string; close: string };

function parseCandleSeries(candles: Candle[]) {
  const map = new Map<number, number>();
  for (const c of candles) {
    map.set(parseInt(c.periodStartUnix) * 1000, parseFloat(c.close));
  }
  return map;
}

function processCandles(data: any) {
  const yesMap = parseCandleSeries(data.candles?.yes || []);
  const noMap = parseCandleSeries(data.candles?.no || []);
  const spotMap = parseCandleSeries(data.candles?.spot || []);

  if (!yesMap.size || !noMap.size) {
    throw new Error('Missing conditional pool candle data');
  }

  const sorted = [
    ...new Set([...yesMap.keys(), ...noMap.keys(), ...spotMap.keys()])
  ].sort((a, b) => a - b);

  let lastYes = 0,
    lastNo = 0,
    lastSpot = 0;

  return sorted.map(time => {
    if (yesMap.has(time)) lastYes = yesMap.get(time)!;
    if (noMap.has(time)) lastNo = noMap.get(time)!;
    if (spotMap.has(time)) lastSpot = spotMap.get(time)!;
    return { time, yes: lastYes, no: lastNo, spot: lastSpot };
  });
}

export const FUTARCHY_KEYS = {
  all: ['futarchy'] as const,
  chart: (proposalId: MaybeRefOrGetter<string>) =>
    [...FUTARCHY_KEYS.all, 'chart', proposalId] as const
};

export function useFutarchyQuery(
  proposalId: MaybeRefOrGetter<string>,
  startTimestamp: MaybeRefOrGetter<number>,
  maxTimestamp: MaybeRefOrGetter<number>
) {
  return useQuery({
    queryKey: FUTARCHY_KEYS.chart(proposalId),
    queryFn: async () => {
      const params = new URLSearchParams({
        minTimestamp: String(toValue(startTimestamp)),
        maxTimestamp: String(toValue(maxTimestamp)),
        includeSpot: 'true'
      });

      const res = await fetch(
        `${FUTARCHY_API_URL}/api/v2/proposals/${toValue(proposalId)}/chart?${params}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const market = data.market as FutarchyMarket;
      const candles = processCandles(data);

      return {
        market,
        candles,
        tradingAddress: (market.trading_address as string) || null,
        pricePrecision: market.timeline?.price_precision ?? 6,
        currencyRate: market.timeline?.currency_rate || 1
      };
    }
  });
}
