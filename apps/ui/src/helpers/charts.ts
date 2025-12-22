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
      timestamp: parseInt(point.startTimestamp),
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
 * Buckets auction price level data into consistent intervals with aggregated volume
 * @param data - Array of auction price level points with price and volume
 * @param intervals - Number of intervals to divide the price range into (default: DEFAULT_PRICE_BUCKET_INTERVALS)
 * @param clearingPrice - Optional clearing price to ensure it falls on a bucket boundary
 * @returns Array of price buckets with aggregated volume
 */
export function bucketPriceDepthData(
  data: AuctionPriceLevelPoint[],
  intervals: number = DEFAULT_PRICE_BUCKET_INTERVALS,
  clearingPrice?: number
): PriceBucket[] {
  if (!data || data.length === 0) return [];

  // Convert strings to numbers and sort by price
  const sortedData = [...data]
    .map(item => ({
      price: parseFloat(item.price),
      volume: parseFloat(item.volume)
    }))
    .sort((a, b) => a.price - b.price);

  let minPrice = sortedData[0].price;
  let maxPrice = sortedData[sortedData.length - 1].price;
  let priceRange = maxPrice - minPrice;

  if (priceRange === 0) {
    return [
      {
        priceStart: minPrice,
        priceEnd: minPrice,
        volume: sortedData.reduce((sum, d) => sum + d.volume, 0)
      }
    ];
  }

  let actualIntervals = intervals;
  let intervalSize = priceRange / intervals;
  let startPrice = minPrice;

  // If clearing price is provided, adjust bucket boundaries to align with it
  if (clearingPrice !== undefined) {
    // Add extra range at start and end (10% of range on each side)
    const extraRange = priceRange * 0.1;
    const expandedMinPrice = Math.max(0, minPrice - extraRange); // Ensure price stays positive
    const expandedMaxPrice = maxPrice + extraRange;
    const expandedRange = expandedMaxPrice - expandedMinPrice;

    // Calculate how many buckets should be below clearing price
    const clearingRatio = (clearingPrice - expandedMinPrice) / expandedRange;
    const bucketsBelow = Math.round(clearingRatio * intervals);
    const bucketsAbove = intervals - bucketsBelow;

    if (bucketsBelow > 0 && bucketsAbove > 0) {
      // Adjust intervals to make clearing price fall exactly on boundary
      const belowRange = clearingPrice - expandedMinPrice;
      const aboveRange = expandedMaxPrice - clearingPrice;
      const belowIntervalSize = belowRange / bucketsBelow;
      const aboveIntervalSize = aboveRange / bucketsAbove;

      // Use the average interval size to maintain reasonable bucket sizes
      intervalSize = (belowIntervalSize + aboveIntervalSize) / 2;
      actualIntervals = Math.round(expandedRange / intervalSize);

      // Adjust start price so clearing price aligns with a boundary
      const clearingBucketIndex = Math.round(
        (clearingPrice - expandedMinPrice) / intervalSize
      );
      startPrice = clearingPrice - clearingBucketIndex * intervalSize;

      // Update working range
      minPrice = expandedMinPrice;
      maxPrice = expandedMaxPrice;
      priceRange = expandedRange;
    }
  }

  const buckets: PriceBucket[] = [];

  // First, generate all buckets
  for (let i = 0; i < actualIntervals; i++) {
    const priceStart = startPrice + i * intervalSize;
    const priceEnd = startPrice + (i + 1) * intervalSize;

    // Skip buckets that are completely outside our data range
    if (priceEnd <= minPrice || priceStart >= maxPrice) continue;

    buckets.push({
      priceStart: Math.max(priceStart, minPrice),
      priceEnd: Math.min(priceEnd, maxPrice),
      volume: 0
    });
  }

  // If clearing price is defined and no bucket ends at the clearing price, add an extra bucket
  if (clearingPrice !== undefined && buckets.length > 0) {
    const hasExactMatch = buckets.some(
      bucket => bucket.priceEnd === clearingPrice
    );

    if (!hasExactMatch) {
      // Find where to insert a bucket that ends at clearing price
      const insertIndex = buckets.findIndex(
        bucket => bucket.priceEnd > clearingPrice
      );

      if (insertIndex === 0) {
        // Clearing price is before all buckets, add a bucket at the beginning
        buckets.unshift({
          priceStart: Math.max(0, clearingPrice - intervalSize),
          priceEnd: clearingPrice,
          volume: 0
        });
      } else if (insertIndex === -1) {
        // Clearing price is after all buckets, add a bucket at the end
        const lastBucket = buckets[buckets.length - 1];
        buckets.push({
          priceStart: lastBucket.priceEnd,
          priceEnd: clearingPrice,
          volume: 0
        });
      }
    }
  }

  sortedData.forEach(dataPoint => {
    // Find the bucket that contains this data point
    const bucketIndex = buckets.findIndex(
      bucket =>
        dataPoint.price >= bucket.priceStart &&
        dataPoint.price < bucket.priceEnd
    );

    // If no bucket found, assign to the last bucket if price equals maxPrice
    const finalBucketIndex =
      bucketIndex >= 0
        ? bucketIndex
        : dataPoint.price === maxPrice && buckets.length > 0
          ? buckets.length - 1
          : -1;

    if (finalBucketIndex >= 0) {
      buckets[finalBucketIndex].volume += dataPoint.volume;
    }
  });

  return buckets;
}

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
