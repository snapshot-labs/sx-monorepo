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
};

type PriceData = {
  price: number;
  volume: number;
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
 * @returns Configuration object containing bucket start price, uniform interval size, and total bucket count
 */
function calculateBucketConfig(
  sortedData: PriceData[],
  targetBucketCount: number,
  referencePrice: number
): {
  bucketStartPrice: number;
  intervalSize: number;
  bucketCount: number;
} {
  const dataMinPrice = sortedData[0].price;
  const dataMaxPrice = sortedData[sortedData.length - 1].price;
  const priceRange = dataMaxPrice - dataMinPrice;

  if (priceRange === 0) {
    return {
      bucketStartPrice: dataMinPrice,
      intervalSize: 0,
      bucketCount: 1
    };
  }

  // Add extra range at start and end (10% of range on each side)
  const extraRange = priceRange * 0.1;
  const expandedMinPrice = Math.max(0, dataMinPrice - extraRange);
  const expandedMaxPrice = dataMaxPrice + extraRange;
  const expandedRange = expandedMaxPrice - expandedMinPrice;

  // Calculate the number of buckets below and above the reference price
  const referenceRatio = (referencePrice - expandedMinPrice) / expandedRange;
  const bucketsBelow = Math.round(referenceRatio * targetBucketCount);
  const bucketsAbove = targetBucketCount - bucketsBelow;

  // Calculate interval sizes for regions below and above reference price
  const belowRange = referencePrice - expandedMinPrice;
  const aboveRange = expandedMaxPrice - referencePrice;
  const belowIntervalSize = belowRange / bucketsBelow;
  const aboveIntervalSize = aboveRange / bucketsAbove;

  // Use the average interval size to maintain reasonable bucket sizes
  // This may lead to slight deviations in total bucket count
  const intervalSize = (belowIntervalSize + aboveIntervalSize) / 2;

  // Calculate bucket start to align reference price with a bucket boundary
  const referenceBucketIndex = Math.round(
    (referencePrice - expandedMinPrice) / intervalSize
  );
  const bucketStartPrice = referencePrice - referenceBucketIndex * intervalSize;

  // Calculate how many buckets we need to cover the expanded range
  const bucketCount = Math.ceil(
    (expandedMaxPrice - bucketStartPrice) / intervalSize
  );

  return {
    bucketStartPrice,
    intervalSize,
    bucketCount
  };
}

/**
 * Groups price data into uniform intervals (buckets) with aggregated volume for chart visualization.
 *
 * Prices falling exactly on bucket boundaries are assigned to the higher bucket.
 * The data range is automatically expanded by 10% on each side for better visualization.
 *
 * @param data - Array of price level points containing price and volume data
 * @param clearingPrice - Optional reference price to align with bucket boundaries (typically clearing price)
 * @param targetBucketCount - Target number of buckets to create (default: 100). Actual count may vary due to reference price alignment
 * @returns Array of price buckets with aggregated volume, ordered by price
 */
export function bucketPriceDepthData(
  data: AuctionPriceLevelPoint[],
  clearingPrice?: number,
  targetBucketCount: number = DEFAULT_PRICE_BUCKET_INTERVALS
): PriceBucket[] {
  if (data.length === 0) return [];

  const sortedData: PriceData[] = data
    .map(item => ({
      price: parseFloat(item.price),
      volume: parseFloat(item.volume)
    }))
    .sort((a, b) => a.price - b.price);

  // Include clearing price in data range if provided and outside bounds
  if (clearingPrice !== undefined) {
    const clearingPriceData = { price: clearingPrice, volume: 0 };

    if (clearingPrice < sortedData[0].price) {
      sortedData.unshift(clearingPriceData);
    } else if (clearingPrice > sortedData[sortedData.length - 1].price) {
      sortedData.push(clearingPriceData);
    }
  }

  // Handle single data point case
  if (sortedData.length === 1) {
    return [
      {
        priceStart: sortedData[0].price,
        priceEnd: sortedData[0].price,
        volume: sortedData[0].volume
      }
    ];
  }

  const effectiveClearingPrice =
    clearingPrice ??
    (sortedData[0].price + sortedData[sortedData.length - 1].price) / 2;

  const { bucketStartPrice, intervalSize, bucketCount } = calculateBucketConfig(
    sortedData,
    targetBucketCount,
    effectiveClearingPrice
  );

  const buckets: PriceBucket[] = [];

  // Creating empty buckets
  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      priceStart: bucketStartPrice + i * intervalSize,
      priceEnd: bucketStartPrice + (i + 1) * intervalSize,
      volume: 0
    });
  }

  // Populating buckets with aggregated volume
  for (const dataPoint of sortedData) {
    const bucketIndex = Math.floor(
      (dataPoint.price - bucketStartPrice) / intervalSize
    );

    if (bucketIndex >= 0 && bucketIndex < buckets.length) {
      buckets[bucketIndex].volume += dataPoint.volume;
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
