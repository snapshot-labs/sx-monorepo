import {
  AreaSeries,
  AreaSeriesPartialOptions,
  ChartOptions,
  createChart,
  DeepPartial,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineSeriesPartialOptions,
  LineStyle,
  SingleValueData,
  TickMarkType,
  Time
} from 'lightweight-charts';
import { MaybeRef } from 'vue';
import { getPriceFormat } from '@/helpers/charts';

export const CHART_SERIES_COLORS = {
  light: {
    lineColor: 'rgba(17, 17, 17, 0.8)',
    areaTopColor: 'rgba(17, 17, 17, 0.4)',
    areaBottomColor: 'rgba(17, 17, 17, 0.04)'
  },
  dark: {
    lineColor: 'rgba(251, 251, 251, 0.8)',
    areaTopColor: 'rgba(251, 251, 251, 0.4)',
    areaBottomColor: 'rgba(251, 251, 251, 0.04)'
  }
};

const CHART_COLORS = {
  light: {
    textColor: 'rgb(87, 96, 106)',
    gridLineColor: 'rgba(229, 229, 230, 0.7)',
    axisLineColor: 'rgb(229, 229, 230)',
    crosshairLabelBackgroundColor: 'rgb(17, 17, 17)'
  },
  dark: {
    textColor: 'rgb(160, 159, 164)',
    gridLineColor: 'rgba(47, 46, 51, 0.7)',
    axisLineColor: 'rgb(47, 46, 51)',
    crosshairLabelBackgroundColor: 'rgb(251, 251, 251)'
  }
};

export const CHART_DEFAULT_OPTIONS = {
  layout: {
    background: { color: 'transparent' },
    attributionLogo: false,
    fontFamily: 'Calibre',
    fontSize: 14
  },
  grid: {
    vertLines: { color: 'transparent' },
    horzLines: { style: LineStyle.Dotted }
  },
  autoSize: true,
  rightPriceScale: {
    borderVisible: false,
    entireTextOnly: true,
    scaleMargins: {
      top: 0.1,
      bottom: 0.1
    }
  },
  handleScroll: {
    vertTouchDrag: false,
    mouseWheel: false,
    pressedMouseMove: false
  },
  handleScale: {
    axisPressedMouseMove: {
      price: false,
      time: false
    },
    mouseWheel: false,
    pinch: false
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    allowBoldLabels: false,
    fixLeftEdge: true,
    fixRightEdge: true,
    tickMarkMaxCharacterLength: 23, // To have max 3-4 labels on the X axis
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const date = new Date(time * 1000);

      if (
        tickMarkType === TickMarkType.Month ||
        tickMarkType === TickMarkType.DayOfMonth
      ) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        });
      }

      return null;
    }
  },
  localization: {
    timeFormatter: (time: number) => {
      const date = new Date(time * 1000);

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      });
    }
  }
};

const SERIES_TYPE_MAPPING = {
  area: AreaSeries,
  line: LineSeries
};

type UseChartOptions = {
  series: MaybeRef<ChartSeries[]>;
  chartOptions?: MaybeRef<DeepPartial<ChartOptions>>;
};

export type ChartSeries =
  | {
      data: SingleValueData[];
      type: 'line';
      options?: LineSeriesPartialOptions;
    }
  | {
      data: SingleValueData[];
      type: 'area';
      options?: AreaSeriesPartialOptions;
    };

export type SupportedSeries = ISeriesApi<'Area' | 'Line', Time>;

export function useChart(options: UseChartOptions) {
  const { series, chartOptions = {} } = options;

  const chartContainer = ref<HTMLElement | null>(null);
  const chart = shallowRef<IChartApi | null>(null);
  const seriesInstances = shallowRef<SupportedSeries[]>([]);

  const { currentTheme } = useTheme();

  function updateChartColors() {
    const seriesValue = toValue(series);

    if (!chart.value) return;

    chart.value.applyOptions({
      layout: {
        textColor: CHART_COLORS[currentTheme.value].textColor
      },
      grid: {
        horzLines: {
          color: CHART_COLORS[currentTheme.value].gridLineColor
        }
      },
      timeScale: {
        borderColor: CHART_COLORS[currentTheme.value].axisLineColor
      },
      rightPriceScale: {
        borderColor: CHART_COLORS[currentTheme.value].axisLineColor
      },
      crosshair: {
        horzLine: {
          labelBackgroundColor:
            CHART_COLORS[currentTheme.value].crosshairLabelBackgroundColor,
          color: CHART_COLORS[currentTheme.value].axisLineColor
        },
        vertLine: {
          labelBackgroundColor:
            CHART_COLORS[currentTheme.value].crosshairLabelBackgroundColor,
          color: CHART_COLORS[currentTheme.value].axisLineColor
        }
      }
    });

    const defaultSeriesColors = CHART_SERIES_COLORS[currentTheme.value];

    seriesInstances.value.forEach((instance, index) => {
      const seriesConfig = seriesValue[index];

      if (!seriesConfig) return;

      if (seriesConfig.type === 'line') {
        const lineOptions = seriesConfig.options || {};
        instance.applyOptions({
          color: lineOptions.color || defaultSeriesColors.lineColor
        });
      } else if (seriesConfig.type === 'area') {
        const areaOptions = seriesConfig.options || {};
        instance.applyOptions({
          lineColor: areaOptions.lineColor || defaultSeriesColors.lineColor,
          topColor: areaOptions.topColor || defaultSeriesColors.areaTopColor,
          bottomColor:
            areaOptions.bottomColor || defaultSeriesColors.areaBottomColor
        });
      }
    });
  }

  function fitContent() {
    if (!chart.value) return;

    chart.value.timeScale().fitContent();
  }

  function createSeries() {
    seriesInstances.value = [];

    toValue(series).forEach(config => {
      const seriesInstance = chart.value!.addSeries(
        SERIES_TYPE_MAPPING[config.type],
        config.options || {}
      );
      seriesInstances.value.push(seriesInstance);
    });
  }

  function updateSeriesData() {
    const seriesConfigs = toValue(series);

    if (!seriesConfigs.length) return;

    const highestValue = Math.max(
      0,
      ...seriesConfigs.flatMap(config => config.data.map(point => point.value))
    );
    const valueFormat = getPriceFormat(highestValue);

    seriesConfigs.forEach((config, index) => {
      if (!seriesInstances.value[index]) return;

      seriesInstances.value[index].applyOptions({ priceFormat: valueFormat });
      seriesInstances.value[index].setData(config.data);
    });

    fitContent();
  }

  function initChart() {
    if (!chartContainer.value) return;

    chart.value = createChart(chartContainer.value, {
      ...CHART_DEFAULT_OPTIONS,
      ...toValue(chartOptions)
    });

    createSeries();
    updateSeriesData();
    updateChartColors();
  }

  watch(currentTheme, () => updateChartColors());

  watch(series, () => {
    if (!chart.value) return;

    // Assuming that series did not change, only its data
    // Changing series would require re-creating the chart
    updateSeriesData();
  });

  onMounted(initChart);

  onUnmounted(() => {
    chart.value?.remove();
    seriesInstances.value = [];
  });

  useResizeObserver(chartContainer, fitContent);

  return {
    chartContainer,
    chart
  };
}
