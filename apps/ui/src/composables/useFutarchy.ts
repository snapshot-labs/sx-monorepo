import { z } from 'zod';

// ⚡ Single API URL for all Futarchy data
const FUTARCHY_API_URL = import.meta.env.VITE_FUTARCHY_API_URL || 'https://api.futarchy.fi/charts';

const VolumeMarketSchema = z.object({
  status: z.string(),
  pool_id: z.string(),
  volume: z.string(),
  volume_usd: z.string()
});

const FutarchyResponseSchema = z.object({
  event_id: z.string(),
  trading_address: z.string().optional(),
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
  }).passthrough(),
  volume: z
    .object({
      conditional_yes: VolumeMarketSchema.optional(),
      conditional_no: VolumeMarketSchema.optional()
    })
    .optional()
}).passthrough();

export type FutarchyMarketData = z.infer<typeof FutarchyResponseSchema>;

export interface CandleDataPoint {
  time: number;
  yes: number;
  no: number;
  spot: number;
}

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
    return {
      rate: timeline?.currency_rate || null,
      tokenSymbol: tokens?.currency?.tokenSymbol || 'sDAI',
      stableSymbol: tokens?.currency?.stableSymbol || null
    };
  });

  /**
   * Process raw candle arrays from the backend into CandleDataPoint[].
   * Applies forward-fill so every timestamp has a value for all series.
   */
  function processCandleData(
    yesCandles: { periodStartUnix: string; close: string }[],
    noCandles: { periodStartUnix: string; close: string }[],
    spotCandles: { periodStartUnix: string; close: string }[],
    startTs?: number  // proposal start timestamp in seconds
  ): { candles: CandleDataPoint[]; scaleFactor: number; hasYes: boolean; hasNo: boolean } {
    const yesMap = new Map<number, number>();
    const noMap = new Map<number, number>();
    const spotMap = new Map<number, number>();
    const allTimestamps = new Set<number>();

    for (const c of yesCandles) {
      const time = parseInt(c.periodStartUnix) * 1000;
      yesMap.set(time, parseFloat(c.close));
      allTimestamps.add(time);
    }

    for (const c of noCandles) {
      const time = parseInt(c.periodStartUnix) * 1000;
      noMap.set(time, parseFloat(c.close));
      allTimestamps.add(time);
    }

    for (const c of spotCandles) {
      const time = parseInt(c.periodStartUnix) * 1000;
      spotMap.set(time, parseFloat(c.close));
      allTimestamps.add(time);
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Back-fill: prepend proposal start time if candles start later
    if (startTs && sortedTimestamps.length > 0) {
      const startMs = startTs * 1000;
      if (startMs < sortedTimestamps[0]) {
        sortedTimestamps.unshift(startMs);
      }
    }

    // Scale factor for very small prices
    const allValues = [...yesMap.values(), ...noMap.values(), ...spotMap.values()].filter(v => v > 0);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
    const scaleFactor = maxValue < 1 ? Math.pow(10, Math.ceil(-Math.log10(maxValue))) : 1;

    // Back-fill initial values: use first known price so the synthetic start
    // candle shows the initial pool price instead of 0
    let lastYes = yesMap.size > 0 ? yesMap.values().next().value! : 0;
    let lastNo = noMap.size > 0 ? noMap.values().next().value! : 0;
    let lastSpot = spotMap.size > 0 ? spotMap.values().next().value! : 0;

    const candles = sortedTimestamps.map(time => {
      if (yesMap.has(time)) lastYes = yesMap.get(time)!;
      if (noMap.has(time)) lastNo = noMap.get(time)!;
      if (spotMap.has(time)) lastSpot = spotMap.get(time)!;
      return { time, yes: lastYes, no: lastNo, spot: lastSpot };
    });

    return { candles, scaleFactor, hasYes: yesMap.size > 0, hasNo: noMap.size > 0 };
  }

  /**
   * Two-phase load:
   * 1. Fast call (includeSpot=false) → render YES/NO candles immediately
   * 2. Async spot call → merge spot candles when they arrive
   */
  async function load() {
    loadingChart.value = true;
    error.value = false;

    try {
      const params = new URLSearchParams({
        minTimestamp: String(startTimestamp.value),
        maxTimestamp: String(maxTimestamp.value),
        includeSpot: 'false'
      });

      // ── Phase 1: Fast YES/NO + metadata ──
      const res = await fetch(
        `${FUTARCHY_API_URL}/api/v2/proposals/${proposalId.value}/chart?${params}`
      );

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();

      // Parse market metadata
      const market = FutarchyResponseSchema.parse(data.market);
      marketData.value = market;

      // Use chart_start_range from API if available, otherwise fall back to proposal start
      const timeline = (data.market as any)?.timeline;
      const effectiveStart: number = timeline?.chart_start_range || startTimestamp.value;

      // Process YES/NO candles (no spot yet)
      const { candles, scaleFactor, hasYes, hasNo } = processCandleData(
        data.candles?.yes || [],
        data.candles?.no || [],
        [],
        effectiveStart
      );

      if (!hasYes || !hasNo) {
        throw new Error('Missing conditional pool candle data');
      }

      candleData.value = candles;
      priceScaleFactor.value = scaleFactor;
      loadingChart.value = false;

      // ── Phase 2: Async spot fetch ──
      const ticker = market.spot?.pool_ticker;
      if (ticker) {
        loadSpotAsync(ticker, effectiveStart);
      }

    } catch (e) {
      console.error('Error fetching Futarchy data', e);
      error.value = true;
      loadingChart.value = false;
    }
  }

  /**
   * Fetch spot candles asynchronously and merge into existing candle data.
   */
  async function loadSpotAsync(ticker: string, effectiveStart?: number) {
    try {
      const minTs = effectiveStart || startTimestamp.value;
      const spotParams = new URLSearchParams({
        ticker,
        minTimestamp: String(minTs),
        maxTimestamp: String(maxTimestamp.value)
      });

      const spotRes = await fetch(
        `${FUTARCHY_API_URL}/api/v1/spot-candles?${spotParams}`
      );

      if (!spotRes.ok) {
        console.warn('[useFutarchy] ⚠️ Spot candles fetch failed:', spotRes.status);
        return;
      }

      const spotData = await spotRes.json();
      const spotCandles = spotData?.spotCandles || [];

      if (spotCandles.length === 0) {
        return;
      }

      // Re-process with existing YES/NO data + new spot candles
      const currentMarket = marketData.value;
      if (!currentMarket) return;

      // Re-fetch existing YES/NO from current candle data
      const yesCandles = candleData.value
        .filter(c => c.yes > 0)
        .map(c => ({ periodStartUnix: String(c.time / 1000), close: String(c.yes) }));
      const noCandles = candleData.value
        .filter(c => c.no > 0)
        .map(c => ({ periodStartUnix: String(c.time / 1000), close: String(c.no) }));

      const { candles, scaleFactor } = processCandleData(yesCandles, noCandles, spotCandles, effectiveStart || startTimestamp.value);



      candleData.value = candles;
      priceScaleFactor.value = scaleFactor;

    } catch (e) {
      console.warn('[useFutarchy] ⚠️ Spot async load error:', e);
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
    error
  };
}
