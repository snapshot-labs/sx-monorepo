import { UTCTimestamp } from 'lightweight-charts';

export type ChartDataPoint = {
  time: UTCTimestamp;
  value: number;
};

export type ChartGranularity = 'hour' | 'minute';

const GRANULARITY_STEP_SIZE: Record<ChartGranularity, number> = {
  hour: 3600,
  minute: 60
};

type RawDataPoint = {
  startTimestamp: string;
  close: string;
};

/**
 * Normalizes time series data to regular intervals and fills missing data points
 * @param rawData - Array of raw data points with string timestamps and values
 * @param granularity - Time granularity ('hour' or 'minute')
 * @param startTimestamp - Start timestamp in seconds (inclusive)
 * @param endTimestamp - End timestamp in seconds (inclusive)
 * @returns Array of ChartDataPoint normalized to regular intervals within the specified time range
 */
export function normalizeTimeSeriesData(
  rawData: RawDataPoint[],
  granularity: ChartGranularity,
  startTimestamp: number,
  endTimestamp: number
): ChartDataPoint[] {
  if (!rawData || rawData.length === 0) return [];

  const parsedData = rawData
    .map(point => ({
      timestamp: parseInt(point.startTimestamp),
      value: parseFloat(point.close)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const filledData: ChartDataPoint[] = [];
  const stepSize = GRANULARITY_STEP_SIZE[granularity];
  const firstDataTimestamp =
    Math.floor(parsedData[0].timestamp / stepSize) * stepSize;

  let dataIndex = 0;
  let currentValue = parsedData[0].value;

  for (
    let timestamp = firstDataTimestamp;
    timestamp <= endTimestamp;
    timestamp += stepSize
  ) {
    if (
      dataIndex < parsedData.length &&
      parsedData[dataIndex].timestamp === timestamp
    ) {
      currentValue = parsedData[dataIndex].value;
      dataIndex++;
    }

    if (timestamp < startTimestamp) continue;

    filledData.push({
      time: timestamp as UTCTimestamp,
      value: currentValue
    });
  }

  return filledData;
}
