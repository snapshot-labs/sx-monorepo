import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { z } from 'zod';

const FUTARCHY_API_URL = 'http://localhost:3030';

const CANDLES_API_URL = 'http://localhost:3030/subgraphs/name/algebra-proposal-candles-v1';

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
  }),
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
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $yesPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
    ) {
      periodStartUnix
      close
    }
    noCandles: candles(
      first: 1000
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $noPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
    ) {
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
    currencyRate: number | null  // Rate to apply to YES/NO prices for USD conversion
  ): Promise<{ candles: CandleDataPoint[]; scaleFactor: number; hasYes: boolean; hasNo: boolean; hasSpot: boolean }> {
    // Use direct fetch instead of Apollo to ensure all variables (including poolTicker) are sent
    const query = `
      query GetCandles($yesPoolId: String!, $noPoolId: String!, $minTimestamp: Int!, $maxTimestamp: Int!) {
        yesCandles: candles(
          first: 1000, orderBy: periodStartUnix, orderDirection: asc,
          where: { pool: $yesPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
        ) { periodStartUnix, close }
        noCandles: candles(
          first: 1000, orderBy: periodStartUnix, orderDirection: asc,
          where: { pool: $noPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
        ) { periodStartUnix, close }
      }
    `;

    const response = await fetch(CANDLES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          yesPoolId: yesPoolId.toLowerCase(),
          noPoolId: noPoolId.toLowerCase(),
          minTimestamp: chartStartRange || startTimestamp.value,
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

    // Apply currency rate to YES/NO prices (sDAI → USD conversion)
    const rate = currencyRate || 1;

    for (const candle of data.yesCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close) * rate;  // Apply rate
      yesMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    for (const candle of data.noCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close) * rate;  // Apply rate
      noMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    // Process spot candles from Express server
    for (const candle of data.spotCandles || []) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close);
      spotMap.set(time, rawPrice);
      allTimestamps.add(time);
    }
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

  async function load() {
    loadingChart.value = true;
    error.value = false;

    try {
      const market = await fetchMarketData();
      if (!market) throw new Error('Failed to fetch market data');
      marketData.value = market;

      const result = await fetchCandleData(
        market.conditional_yes.pool_id,
        market.conditional_no.pool_id,
        market.spot?.pool_ticker || null,
        (market as any).timeline?.chart_start_range || null,
        (market as any).timeline?.currency_rate || null  // sDAI→USD rate for YES/NO prices
      );

      // Error if missing YES or NO candles (conditional pools required)
      if (!result.hasYes || !result.hasNo) {
        console.error('[useFutarchy] ❌ Missing conditional pool data:', {
          hasYes: result.hasYes,
          hasNo: result.hasNo
        });
        throw new Error('Missing conditional pool candle data');
      }

      // Alert if missing SPOT candles (still show chart)
      if (!result.hasSpot) {
        console.warn('[useFutarchy] ⚠️ Missing spot candle data - chart will show without spot line');
      }

      candleData.value = result.candles;
      priceScaleFactor.value = result.scaleFactor;
    } catch (e) {
      console.error('Error fetching Futarchy data', e);
      error.value = true;
    } finally {
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
    loadingChart,
    error
  };
}
