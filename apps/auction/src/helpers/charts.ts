import {
  BarPrice,
  PriceFormatCustom,
  SingleValueData,
  UTCTimestamp
} from 'lightweight-charts';
import { AuctionPriceHistoryPoint, AuctionPriceLevelPoint } from './auction';

export type ChartGranularity = 'hour' | 'minute';

export type Coordinates = {
  x: number;
  y: number;
};

export type PriceBucket = {
  priceStart: number;
  priceEnd: number;
  volume: number;
  buyAmount: bigint;
};

type PriceData = {
  price: number;
  volume: number;
  buyAmount: bigint;
};

const GRANULARITY_STEP_SIZE: Record<ChartGranularity, number> = {
  hour: 3600,
  minute: 60
};

const DEFAULT_PRICE_BUCKET_INTERVALS = 100;

export function roundTimestampToGranularity(
  timestamp: number,
  granularity: ChartGranularity
): number {
  const stepSize = GRANULARITY_STEP_SIZE[granularity];
  return Math.floor(timestamp / stepSize) * stepSize;
}

/**
 * Normalizes time series data to regular intervals, fills gaps, and clamps to time range
 * @param data - Array of raw data points with string timestamps and values
 * @param granularity - Time granularity ('hour' or 'minute')
 * @param startTime - Start timestamp in seconds (inclusive)
 * @param endTime - End timestamp in seconds (inclusive)
 * @returns Array of SingleValueData normalized, filled, and clamped to the time range
 */
export function normalizeTimeSeriesData(
  data: AuctionPriceHistoryPoint[],
  granularity: ChartGranularity,
  startTime: number,
  endTime: number
): SingleValueData[] {
  if (!data || data.length === 0) return [];

  const parsedData = data
    .map(point => ({
      timestamp: point.startTimestamp,
      value: parseFloat(point.close)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const stepSize = GRANULARITY_STEP_SIZE[granularity];
  const normalizedStartTime = roundTimestampToGranularity(
    startTime,
    granularity
  );
  const normalizedEndTime = roundTimestampToGranularity(endTime, granularity);

  const result: SingleValueData[] = [];
  let dataIndex = 0;
  let lastKnownValue = parsedData[0].value;

  // Find the last known value before the start time
  // Will be used as starting value for filling gaps when the data starts after startTime
  // In case there is no data before startTime, the first data point's value will be used
  // which may result in incorrect values for the filled gaps
  while (
    dataIndex < parsedData.length &&
    parsedData[dataIndex].timestamp < normalizedStartTime
  ) {
    lastKnownValue = parsedData[dataIndex].value;
    dataIndex++;
  }

  for (
    let timestamp = normalizedStartTime;
    timestamp <= normalizedEndTime;
    timestamp += stepSize
  ) {
    if (
      dataIndex < parsedData.length &&
      parsedData[dataIndex].timestamp === timestamp
    ) {
      lastKnownValue = parsedData[dataIndex].value;
      dataIndex++;
    }

    result.push({
      time: timestamp as UTCTimestamp,
      value: lastKnownValue
    });
  }

  return result;
}

export function getPriceFormat(highestValue: number): PriceFormatCustom {
  let precision: number;
  const value = Math.abs(highestValue);

  if (value === 0) {
    precision = 2;
  } else if (value >= 5) {
    precision = 0;
  } else if (value >= 1) {
    precision = 2;
  } else {
    const [, exponent] = value.toExponential().split('e');
    const exp = parseInt(exponent);
    precision = Math.abs(exp) + 2; // show last 3 significant digits
  }

  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard',
    maximumFractionDigits: precision
  });

  return {
    type: 'custom',
    minMove: Math.pow(10, -precision),
    formatter: (price: BarPrice) => {
      return formatter.format(price);
    }
  };
}

/**
 * Calculates bucket configuration for price data visualization with reference price alignment.
 *
 * Creates a bucketing strategy that ensures a reference price (e.g., clearing price) falls
 * exactly on a bucket boundary for visual emphasis. The data range is expanded by 10% on
 * each side for better chart visualization, and may result in empty buckets on the edges.
 *
 * @param sortedData - Array of price data sorted by price in ascending order
 * @param targetBucketCount - Target number of buckets to create (actual count may vary slightly due to alignment requirements)
 * @param referencePrice - Price value to align with bucket boundaries for visual emphasis
 * @returns Configuration object containing the number of buckets below and above the reference price, and the interval size
 */
function calculateBucketConfig(
  sortedData: PriceData[],
  targetBucketCount: number,
  referencePrice: number
): {
  bucketsBelow: number;
  bucketsAbove: number;
  intervalSize: number;
} {
  const dataMinPrice = sortedData[0].price;
  const dataMaxPrice = sortedData[sortedData.length - 1].price;
  const priceRange = dataMaxPrice - dataMinPrice || sortedData[0].price;

  // Add extra range at start and end (10% of range on each side)
  const extraRange = priceRange * 0.1;
  const expandedMinPrice = dataMinPrice - extraRange;
  const expandedMaxPrice = dataMaxPrice + extraRange;
  const expandedRange = expandedMaxPrice - expandedMinPrice;

  // Calculate the number of buckets below and above the reference price
  const referenceRatio = (referencePrice - expandedMinPrice) / expandedRange;
  const bucketsBelow = Math.round(referenceRatio * targetBucketCount);
  const bucketsAbove = targetBucketCount - bucketsBelow;

  // Calculate interval size for uniform buckets
  const intervalSize = expandedRange / targetBucketCount;

  return {
    bucketsBelow,
    bucketsAbove,
    intervalSize
  };
}

/**
 * Creates empty price buckets centered around a reference price with calculated configuration.
 *
 * @param sortedData - Array of price data sorted by price in ascending order
 * @param targetBucketCount - Target number of buckets to create
 * @param clearingPrice - Clearing price to align with bucket boundaries.
 * @returns Array of empty price buckets ordered by price
 */
function createPriceBuckets(
  sortedData: PriceData[],
  targetBucketCount: number,
  clearingPrice: number
): PriceBucket[] {
  const { bucketsBelow, bucketsAbove, intervalSize } = calculateBucketConfig(
    sortedData,
    targetBucketCount,
    clearingPrice
  );

  const buckets: PriceBucket[] = [];

  // Buckets are created from the clearing price outwards,
  // to avoid decimal precision issues when calculating start and end prices

  for (let i = bucketsBelow - 1; i >= 0; i--) {
    const priceStart = clearingPrice - (i + 1) * intervalSize;
    const priceEnd = clearingPrice - i * intervalSize;

    // Skip buckets that end below 0
    if (priceEnd <= 0) continue;

    buckets.push({
      priceStart: Math.max(0, priceStart), // Ensure first bucket starts at 0 minimum
      priceEnd,
      volume: 0,
      buyAmount: 0n
    });
  }

  for (let i = 0; i < bucketsAbove; i++) {
    buckets.push({
      priceStart: clearingPrice + i * intervalSize,
      priceEnd: clearingPrice + (i + 1) * intervalSize,
      volume: 0,
      buyAmount: 0n
    });
  }

  return buckets;
}

/**
 * Groups price data into uniform intervals (buckets) with aggregated volume for chart visualization.
 *
 * Prices falling exactly on bucket boundaries are assigned to the higher bucket.
 * The data range is automatically expanded by 10% on each side for better visualization.
 *
 * @param data - Array of price level points containing price and volume data
 * @param clearingPrice - Reference price to align with bucket boundaries (typically clearing price)
 * @param targetBucketCount - Target number of buckets to create (default: 100). Actual count may vary due to reference price alignment
 * @returns Array of price buckets with aggregated volume, ordered by price
 */
export function bucketPriceDepthData(
  data: AuctionPriceLevelPoint[],
  clearingPrice: number,
  targetBucketCount: number = DEFAULT_PRICE_BUCKET_INTERVALS
): PriceBucket[] {
  const sortedData: PriceData[] = data
    .map(item => ({
      price: parseFloat(item.price),
      volume: parseFloat(item.volume),
      buyAmount: BigInt(item.buyAmount)
    }))
    .sort((a, b) => a.price - b.price);

  if (sortedData.length === 0) {
    sortedData.push({ price: clearingPrice, volume: 0, buyAmount: 0n });
  } else if (clearingPrice < sortedData[0].price) {
    sortedData.unshift({ price: clearingPrice, volume: 0, buyAmount: 0n });
  } else if (clearingPrice > sortedData[sortedData.length - 1].price) {
    sortedData.push({ price: clearingPrice, volume: 0, buyAmount: 0n });
  }

  const buckets = createPriceBuckets(
    sortedData,
    targetBucketCount,
    clearingPrice
  );

  let bucketIndex = 0;
  let dataIndex = 0;

  while (dataIndex < sortedData.length && bucketIndex < buckets.length) {
    const dataPoint = sortedData[dataIndex];
    const bucket = buckets[bucketIndex];

    if (dataPoint.price < bucket.priceStart) {
      dataIndex++;
    } else if (dataPoint.price < bucket.priceEnd) {
      bucket.volume += dataPoint.volume;
      bucket.buyAmount += dataPoint.buyAmount;
      dataIndex++;
    } else {
      bucketIndex++;
    }
  }

  return buckets;
}

/**
 * Calculates optimal positioning for an element within a container to prevent overflow.
 *
 * Automatically adjusts element position to ensure it remains fully visible within the
 * container boundaries. If the element would overflow on the right or bottom, it's
 * repositioned to the left or top of the target coordinates.
 *
 * @param coordinates - Target position coordinates for the element
 * @param element - HTML element to be positioned
 * @param container - Container element that defines the boundaries
 * @param margin - Minimum margin from container edges (default: 0)
 * @returns Adjusted coordinates that keep the element within container bounds
 */
export function getSmartPosition(
  coordinates: Coordinates,
  element: HTMLElement,
  container: HTMLElement,
  margin = 0
): Coordinates {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const elementWidth = elementRect.width;
  const elementHeight = elementRect.height;
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  const { x, y } = coordinates;

  let left = x + margin;
  let top = y + margin;

  if (left + elementWidth > containerWidth) {
    left = Math.max(margin, x - elementWidth - margin);
  }

  if (top + elementHeight > containerHeight) {
    top = Math.max(margin, y - elementHeight - margin);
  }

  return { x: left, y: top };
}
