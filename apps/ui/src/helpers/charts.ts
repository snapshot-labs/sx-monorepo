import { PriceFormat, SingleValueData, UTCTimestamp } from 'lightweight-charts';
import { AuctionPriceHistoryPoint } from './auction';

export type ChartGranularity = 'hour' | 'minute';

const GRANULARITY_STEP_SIZE: Record<ChartGranularity, number> = {
  hour: 3600,
  minute: 60
};

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

export function getPriceFormat(highestValue: number): Partial<PriceFormat> {
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

  return {
    type: 'custom',
    minMove: Math.pow(10, -precision),
    formatter: (price: number) => {
      return String(parseFloat(price.toFixed(precision)));
    }
  };
}
