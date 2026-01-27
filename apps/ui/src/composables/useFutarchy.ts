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
    price_usd: z.number().nullable()
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
}

const CANDLES_QUERY = gql`
  query GetCandles(
    $yesPoolId: String!
    $noPoolId: String!
    $maxTimestamp: Int!
  ) {
    yesCandles: candles(
      first: 1000
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $yesPoolId, periodStartUnix_lte: $maxTimestamp }
    ) {
      periodStartUnix
      close
    }
    noCandles: candles(
      first: 1000
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $noPoolId, periodStartUnix_lte: $maxTimestamp }
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
    noPoolId: string
  ): Promise<{ candles: CandleDataPoint[]; scaleFactor: number }> {
    const { data } = await candlesApollo.query({
      query: CANDLES_QUERY,
      variables: {
        yesPoolId: yesPoolId.toLowerCase(),
        noPoolId: noPoolId.toLowerCase(),
        maxTimestamp: maxTimestamp.value
      }
    });

    const yesMap = new Map<number, number>();
    const noMap = new Map<number, number>();
    const allTimestamps = new Set<number>();

    for (const candle of data.yesCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close);
      yesMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    for (const candle of data.noCandles) {
      const time = parseInt(candle.periodStartUnix) * 1000;
      const rawPrice = parseFloat(candle.close);
      noMap.set(time, rawPrice);
      allTimestamps.add(time);
    }

    // Express server already handles forward-fill, just merge YES and NO data
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    let lastYes = 0;
    let lastNo = 0;

    const allValues = [...yesMap.values(), ...noMap.values()].filter(
      v => v > 0
    );
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
    const scaleFactor =
      maxValue < 1 ? Math.pow(10, Math.ceil(-Math.log10(maxValue))) : 1;

    const candles = sortedTimestamps.map(time => {
      if (yesMap.has(time)) lastYes = yesMap.get(time)!;
      if (noMap.has(time)) lastNo = noMap.get(time)!;
      return { time, yes: lastYes, no: lastNo };
    });

    return { candles, scaleFactor };
  }

  async function load() {
    loadingChart.value = true;
    error.value = false;

    try {
      const market = await fetchMarketData();
      if (!market) throw new Error('Failed to fetch market data');
      marketData.value = market;

      const { candles, scaleFactor } = await fetchCandleData(
        market.conditional_yes.pool_id,
        market.conditional_no.pool_id
      );
      candleData.value = candles;
      priceScaleFactor.value = scaleFactor;
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
