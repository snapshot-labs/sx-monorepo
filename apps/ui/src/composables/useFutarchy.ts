import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { z } from 'zod';

// ⚡ Change this to switch between Local and Remote API
const BASE_API_URL = import.meta.env.VITE_FUTARCHY_API_URL || 'https://rwh1qtmir9.execute-api.eu-north-1.amazonaws.com';

const FUTARCHY_API_URL = BASE_API_URL;
// Candles endpoint: use api.futarchy.fi/candles/graphql directly (not through futarchy-charts proxy)
const CANDLES_API_URL = (() => {
  try {
    const url = new URL(BASE_API_URL);
    return `https://api.futarchy.fi/candles/graphql`;
  } catch {
    // Fallback for relative URLs
    return `${BASE_API_URL}/candles/graphql`;
  }
})();

const VolumeMarketSchema = z.object({
  status: z.string(),
  pool_id: z.string(),
  volume: z.string(),
  volume_usd: z.string()
});

const FutarchyResponseSchema = z.object({
  event_id: z.string(),
  conditional_yes: z.object({
    price_usd: z.number(),
    pool_id: z.string()
  }),
  conditional_no: z.object({
    price_usd: z.number(),
    pool_id: z.string()
  }),
  spot: z.object({
    price_usd: z.number().nullable(),
    pool_ticker: z.string().nullable().optional()
  }),
  company_tokens: z.object({
    base: z.object({
      tokenSymbol: z.string()
    })
  }).passthrough(),  // Allow currency field to pass through
  volume: z
    .object({
      conditional_yes: VolumeMarketSchema.optional(),
      conditional_no: VolumeMarketSchema.optional()
    })
    .optional()
}).passthrough();  // Allow extra fields like timeline

export type FutarchyMarketData = z.infer<typeof FutarchyResponseSchema>;

export interface CandleDataPoint {
  time: number;
  yes: number;
  no: number;
  spot: number;
}

const CANDLES_QUERY = gql`
  query GetCandles(
    $yesPoolId: String!
    $noPoolId: String!
    $minTimestamp: Int!
    $maxTimestamp: Int!
    $poolTicker: String
  ) {
    yesCandles: candles(
      first: 1000
      orderBy: time
      orderDirection: asc
      where: { pool: $yesPoolId, time_gte: $minTimestamp, time_lte: $maxTimestamp, period: 3600 }
    ) {
      time
      periodStartUnix
      close
    }
    noCandles: candles(
      first: 1000
      orderBy: time
      orderDirection: asc
      where: { pool: $noPoolId, time_gte: $minTimestamp, time_lte: $maxTimestamp, period: 3600 }
    ) {
      time
      periodStartUnix
      close
    }
  }
`;

const candlesApollo = new ApolloClient({
  link: createHttpLink({ uri: CANDLES_API_URL }),
  cache: new InMemoryCache({ addTypename: false }),
  defaultOptions: { query: { fetchPolicy: 'no-cache' } }
});

export function useFutarchy(
  proposalId: Ref<string>,
  startTimestamp: Ref<number>,
  maxTimestamp: Ref<number>
) {
  const marketData = ref<FutarchyMarketData | null>(null);
  const candleData = ref<CandleDataPoint[]>([]);
  const priceScaleFactor = ref(1);
  const loadingChart = ref(true);
  const error = ref(false);

  const totalVolumeUsd = computed(() => {
    if (!marketData.value?.volume) return 0;
    const yesVolume = parseFloat(
      marketData.value.volume.conditional_yes?.volume_usd || '0'
    );
    const noVolume = parseFloat(
      marketData.value.volume.conditional_no?.volume_usd || '0'
    );
    return yesVolume + noVolume;
  });

  // Expose currency info for Chart toggle (sDAI/xDAI switch)
  const currencyInfo = computed(() => {
    if (!marketData.value) return null;
    const timeline = (marketData.value as any).timeline;
    const tokens = (marketData.value as any).company_tokens;
    console.log('[useFutarchy] company_tokens:', tokens);
    console.log('[useFutarchy] tokens.currency:', tokens?.currency);
    return {
      rate: timeline?.currency_rate || null,  // Rate to apply (e.g., 1.22)
      tokenSymbol: tokens?.currency?.tokenSymbol || 'sDAI',  // Native symbol
      stableSymbol: tokens?.currency?.stableSymbol || null  // Converted symbol (e.g., xDAI)
    };
  });

  async function fetchMarketData(): Promise<FutarchyMarketData | null> {
    const res = await fetch(
      `${FUTARCHY_API_URL}/api/v1/market-events/proposals/${proposalId.value}/prices`
    );
    return FutarchyResponseSchema.parse(await res.json());
  }

  // shouldInvert removed - Algebra subgraph handles inversion via isInverted field on Pool

  async function fetchCandleData(
    yesPoolId: string,
    noPoolId: string,
    poolTicker: string | null,
    chartStartRange: number | null,
    currencyRate: number | null,  // Rate to apply to YES/NO prices for USD conversion
    chainId: number  // Chain ID for pool ID prefixing (100=Gnosis, 1=Mainnet)
  ): Promise<{ candles: CandleDataPoint[]; scaleFactor: number; hasYes: boolean; hasNo: boolean; hasSpot: boolean }> {
    // Use direct fetch instead of Apollo to ensure all variables (including poolTicker) are sent
    // Checkpoint-native query format: time field, integer period, chain-prefixed pool IDs
    const query = `
      query GetCandles($yesPoolId: String!, $noPoolId: String!, $minTimestamp: Int!, $maxTimestamp: Int!) {
        yesCandles: candles(
          first: 1000, orderBy: time, orderDirection: asc,
          where: { pool: $yesPoolId, time_gte: $minTimestamp, time_lte: $maxTimestamp, period: 3600 }
        ) { time, periodStartUnix, close }
        noCandles: candles(
          first: 1000, orderBy: time, orderDirection: asc,
          where: { pool: $noPoolId, time_gte: $minTimestamp, time_lte: $maxTimestamp, period: 3600 }
        ) { time, periodStartUnix, close }
      }
    `;

    const response = await fetch(CANDLES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          yesPoolId: `${chainId}-${yesPoolId.toLowerCase()}`,
          noPoolId: `${chainId}-${noPoolId.toLowerCase()}`,
          minTimestamp: startTimestamp.value,
          maxTimestamp: maxTimestamp.value,
          poolTicker
        }
      })
    });

    const result = await response.json();
    const data = result.data;

    const yesMap = new Map<number, number>();
    const noMap = new Map<number, number>();
    const spotMap = new Map<number, number>();
    const allTimestamps = new Set<number>();

    // Store RAW prices without rate - rate will be applied in Chart.vue based on toggle
    for (const candle of data.yesCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close);  // Raw price, no rate applied here
      yesMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    for (const candle of data.noCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close);  // Raw price, no rate applied here
      noMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    // Display spot candles logic was moved to a separate fetch in load()
    // Express server already handles forward-fill, just merge YES and NO data
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    let lastYes = 0;
    let lastNo = 0;
    let lastSpot = 0;

    const allValues = [...yesMap.values(), ...noMap.values(), ...spotMap.values()].filter(
      v => v > 0
    );
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
    const scaleFactor =
      maxValue < 1 ? Math.pow(10, Math.ceil(-Math.log10(maxValue))) : 1;

    const candles = sortedTimestamps.map(time => {
      if (yesMap.has(time)) lastYes = yesMap.get(time)!;
      if (noMap.has(time)) lastNo = noMap.get(time)!;
      if (spotMap.has(time)) lastSpot = spotMap.get(time)!;
      return { time, yes: lastYes, no: lastNo, spot: lastSpot };
    });

    return { candles, scaleFactor, hasYes: yesMap.size > 0, hasNo: noMap.size > 0, hasSpot: spotMap.size > 0 };
  }

  const loadingSpot = ref(false);

  async function fetchSpotCandles(
    poolTicker: string,
    minTimestamp: number,
    maxTimestamp: number
  ): Promise<{ periodStartUnix: string; close: string }[]> {
    const params = new URLSearchParams({
      ticker: poolTicker,
      minTimestamp: String(minTimestamp),
      maxTimestamp: String(maxTimestamp),
      _t: String(Date.now()) // cache buster
    });
    const spotUrl = `${FUTARCHY_API_URL}/api/v1/spot-candles?${params}`;
    console.log(`[useFutarchy] 🔍 Fetching spot from: ${spotUrl}`);
    const response = await fetch(spotUrl);
    console.log(`[useFutarchy] 🔍 Spot response status: ${response.status}`);
    const data = await response.json();
    console.log(`[useFutarchy] 🔍 Spot response keys: ${Object.keys(data)}, spotCandles length: ${(data.spotCandles || []).length}`);
    return data.spotCandles || [];
  }

  function mergeSpotIntoCandles(
    existing: CandleDataPoint[],
    spotCandles: { periodStartUnix: string; close: string }[]
  ): CandleDataPoint[] {
    // Sort spot entries by time for binary search
    const sortedSpot = spotCandles
      .map(c => ({ time: parseInt(c.periodStartUnix) * 1000, value: parseFloat(c.close) }))
      .sort((a, b) => a.time - b.time);

    if (sortedSpot.length === 0) return existing;

    // For each candle, find the nearest spot value (latest spot ≤ candle time)
    return existing.map(candle => {
      // Binary search: find last spot entry ≤ candle.time
      let lo = 0, hi = sortedSpot.length - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sortedSpot[mid].time <= candle.time) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const spotValue = best >= 0 ? sortedSpot[best].value : 0;
      return { ...candle, spot: spotValue || candle.spot };
    });
  }

  async function load() {
    loadingChart.value = true;
    error.value = false;

    try {
      const market = await fetchMarketData();
      if (!market) throw new Error('Failed to fetch market data');
      marketData.value = market;

      const chainId = (market as any).timeline?.chain_id || 100;

      // 1️⃣ Fetch YES/NO candles first (fast - direct from Checkpoint)
      const result = await fetchCandleData(
        market.conditional_yes.pool_id,
        market.conditional_no.pool_id,
        market.spot?.pool_ticker || null,
        (market as any).timeline?.chart_start_range || null,
        (market as any).timeline?.currency_rate || null,
        chainId
      );

      if (!result.hasYes || !result.hasNo) {
        console.error('[useFutarchy] ❌ Missing conditional pool data');
        throw new Error('Missing conditional pool candle data');
      }

      // Show chart immediately with YES/NO data
      candleData.value = result.candles;
      priceScaleFactor.value = result.scaleFactor;
      loadingChart.value = false;

      // 2️⃣ Fetch spot candles in background (slower - GeckoTerminal via proxy)
      const poolTicker = market.spot?.pool_ticker;
      if (poolTicker) {
        loadingSpot.value = true;
        const chartStart = startTimestamp.value;

        fetchSpotCandles(poolTicker, chartStart, maxTimestamp.value)
          .then(async spotCandles => {
            console.log(`[useFutarchy] 🔍 Spot candles received: ${spotCandles.length}`);
            if (spotCandles.length > 0) {
              console.log(`[useFutarchy] 🔍 First spot: t=${spotCandles[0].periodStartUnix} close=${spotCandles[0].close}`);
              console.log(`[useFutarchy] 🔍 Existing candles: ${candleData.value.length}, first time: ${candleData.value[0]?.time}`);
              // Force Vue reactivity: assign new array to trigger chart watcher
              const merged = mergeSpotIntoCandles(candleData.value, spotCandles);
              const spotCount = merged.filter(c => c.spot > 0).length;
              console.log(`[useFutarchy] 🔍 Merged: ${merged.length} candles, ${spotCount} have spot > 0`);
              if (merged.length > 0) {
                const sample = merged[Math.floor(merged.length / 2)];
                console.log(`[useFutarchy] 🔍 Sample merged candle: time=${sample.time} yes=${sample.yes} no=${sample.no} spot=${sample.spot}`);
              }
              candleData.value = [];          // Clear first to force change detection
              await nextTick();
              candleData.value = merged;      // Then set merged data
              console.log(`[useFutarchy] ✅ Spot candles merged: ${spotCandles.length} points`);
            } else {
              console.warn('[useFutarchy] ⚠️ No spot candle data returned');
            }
          })
          .catch(err => {
            console.warn('[useFutarchy] ⚠️ Spot candles failed:', err.message);
          })
          .finally(() => {
            loadingSpot.value = false;
          });
      }
    } catch (e) {
      console.error('Error fetching Futarchy data', e);
      error.value = true;
      loadingChart.value = false;
    }
  }

  onMounted(load);
  watch([proposalId, maxTimestamp], load);

  return {
    marketData,
    candleData,
    priceScaleFactor,
    totalVolumeUsd,
    currencyInfo,
    loadingChart,
    loadingSpot,
    error
  };
}
