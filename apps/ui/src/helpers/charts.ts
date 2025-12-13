import { UTCTimestamp } from 'lightweight-charts';

export type ChartDataPoint = {
  time: UTCTimestamp;
  value: number;
};

export type ChartGranularity = 'hour' | 'minute';

type RawDataPoint = {
  startTimestamp: string;
  close: string;
};

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
 * @param rawData - Array of raw data points with string timestamps and values
 * @param granularity - Time granularity ('hour' or 'minute')
 * @param startTime - Start timestamp in seconds (inclusive)
 * @param endTime - End timestamp in seconds (inclusive)
 * @returns Array of ChartDataPoint normalized, filled, and clamped to the time range
 */
export function normalizeTimeSeriesData(
  rawData: RawDataPoint[],
  granularity: ChartGranularity,
  startTime: number,
  endTime: number
): ChartDataPoint[] {
  if (!rawData || rawData.length === 0) return [];

  const parsedData = rawData
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

  const result: ChartDataPoint[] = [];
  let dataIndex = 0;
  let lastValue = 0;

  // Find the first data point that could affect our range
  while (
    dataIndex < parsedData.length &&
    parsedData[dataIndex].timestamp < normalizedStartTime
  ) {
    lastValue = parsedData[dataIndex].value;
    dataIndex++;
  }

  // Single loop through the time range
  for (
    let timestamp = normalizedStartTime;
    timestamp <= normalizedEndTime;
    timestamp += stepSize
  ) {
    let value = lastValue;

    // Check if we have a data point at this timestamp
    if (
      dataIndex < parsedData.length &&
      parsedData[dataIndex].timestamp === timestamp
    ) {
      value = parsedData[dataIndex].value;
      lastValue = value;
      dataIndex++;
    }

    result.push({
      time: timestamp as UTCTimestamp,
      value
    });
  }

  return result;
}
