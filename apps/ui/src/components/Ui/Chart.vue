<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import chartData from './chart.json';

interface DataSeries {
  id: string;
  label: string;
  color: string;
  data: { time: number; value: number }[];
}

const chartContainer = ref<HTMLElement | null>(null);
const { width: containerWidth, height: containerHeight } =
  useElementSize(chartContainer);

// Load data from JSON
const dataSeries = computed<DataSeries[]>(() =>
  chartData.series.map(seriesConfig => ({
    ...seriesConfig,
    data: chartData.data.map((point: any) => ({
      time: point.time,
      value: point[seriesConfig.id] || 0
    }))
  }))
);

// Computed chart dimensions
const padding = { top: 20, right: 40, bottom: 50, left: 4 };
const chartWidth = computed(
  () => containerWidth.value - padding.left - padding.right
);
const chartHeight = computed(
  () => (containerHeight.value || 400) - padding.top - padding.bottom
);

// Computed time range
const timeRange = computed(() => {
  if (dataSeries.value.length === 0) return { min: 0, max: 0, range: 0 };
  const allTimes = dataSeries.value[0].data.map(d => d.time);
  const min = Math.min(...allTimes);
  const max = Math.max(...allTimes);
  return { min, max, range: max - min };
});

// Computed value range with buffer
const valueRange = computed(() => {
  const allValues = dataSeries.value.flatMap(series =>
    series.data.map(d => d.value)
  );
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const buffer = range * 0.2;
  return {
    min: Math.max(0, dataMin - buffer),
    max: dataMax + buffer
  };
});

// Scale functions as computed
const scaleX = computed(
  () => (time: number) =>
    padding.left +
    ((time - timeRange.value.min) / timeRange.value.range) * chartWidth.value
);

const scaleY = computed(
  () => (value: number) =>
    padding.top +
    chartHeight.value -
    ((value - valueRange.value.min) /
      (valueRange.value.max - valueRange.value.min)) *
      chartHeight.value
);

// Track hover state for legend updates
const hoveredDataIndex = ref<number | null>(null);

// Calculate current percentages (latest values or hovered values)
const currentPercentages = computed(() => {
  const dataIndex =
    hoveredDataIndex.value ?? dataSeries.value[0].data.length - 1;
  return dataSeries.value.map(series => ({
    ...series,
    percentage: series.data[dataIndex].value
  }));
});

// Format date/time helpers
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

// SVG helper functions
const createSVGElement = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  styles?: Partial<CSSStyleDeclaration>
): SVGElementTagNameMap[K] => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (styles) Object.assign(el.style, styles);
  return el;
};

const measureText = (
  svg: SVGSVGElement,
  text: string,
  fontSize: string,
  fontWeight?: string
) => {
  const temp = createSVGElement('text', {
    'font-size': fontSize,
    ...(fontWeight && { 'font-weight': fontWeight })
  });
  temp.textContent = text;
  temp.style.visibility = 'hidden';
  svg.appendChild(temp);
  const width = temp.getComputedTextLength?.() || text.length * 7;
  svg.removeChild(temp);
  return width;
};

const createPathData = (
  points: { time: number; value: number }[],
  scaleX: (t: number) => number,
  scaleY: (v: number) => number
) =>
  points
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.time)} ${scaleY(p.value)}`
    )
    .join(' ');

// Helper to clean up elements
const cleanupElements = (...elements: (Element | null | Element[])[]) => {
  elements
    .flat()
    .filter(Boolean)
    .forEach(el => el?.remove());
};

function drawChart() {
  if (!chartContainer.value || dataSeries.value.length === 0) return;

  const container = chartContainer.value;
  container.innerHTML = '';

  const svg = createSVGElement('svg', {
    width: containerWidth.value.toString(),
    height: (containerHeight.value || 400).toString()
  });
  container.appendChild(svg);

  const scaleXFn = scaleX.value;
  const scaleYFn = scaleY.value;

  // Draw grid lines and Y-axis labels
  Array.from({ length: 6 }, (_, i) => {
    const y = padding.top + (i / 5) * chartHeight.value;
    const value =
      valueRange.value.max -
      (i / 5) * (valueRange.value.max - valueRange.value.min);

    svg.appendChild(
      createSVGElement('line', {
        x1: padding.left.toString(),
        y1: y.toString(),
        x2: (padding.left + chartWidth.value).toString(),
        y2: y.toString(),
        stroke: '#e5e7eb',
        'stroke-width': '1',
        ...(i !== 5 && { 'stroke-dasharray': '4,4' })
      })
    );

    const text = createSVGElement('text', {
      x: (padding.left + chartWidth.value + 10).toString(),
      y: y.toString(),
      fill: '#9ca3af',
      'font-size': '13',
      'dominant-baseline': 'middle',
      'text-anchor': 'start'
    });
    text.textContent = `$${value.toFixed(0)}`;
    svg.appendChild(text);
  });

  // Draw X-axis labels (dates)
  Array.from({ length: 4 }, (_, i) => {
    const time = timeRange.value.min + (i / 3) * timeRange.value.range;
    const x = scaleXFn(time);

    const text = createSVGElement('text', {
      x: x.toString(),
      y: (padding.top + chartHeight.value + 25).toString(),
      fill: '#9ca3af',
      'font-size': '13',
      'text-anchor': 'middle'
    });
    text.textContent = formatDate(time);
    svg.appendChild(text);

    // Remove if cut off on left edge
    if (x - (text.getComputedTextLength?.() || 50) / 2 < padding.left) {
      svg.removeChild(text);
    }
  });

  // Create group for lines that will be updated on hover
  const linesGroup = createSVGElement('g');
  svg.appendChild(linesGroup);

  // Store line paths for updating
  const linePaths: {
    series: DataSeries;
    coloredPath: SVGPathElement;
    greyPath: SVGPathElement;
  }[] = [];

  // Store endpoint circles for toggling visibility
  const endpointCircles: SVGCircleElement[] = [];

  // Draw lines for each series (split into colored and grey parts)
  dataSeries.value.forEach(series => {
    // Full colored path (initially visible)
    const pathData = createPathData(series.data, scaleXFn, scaleYFn);

    const coloredPath = createSVGElement('path', {
      d: pathData,
      stroke: series.color,
      'stroke-width': '2',
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    linesGroup.appendChild(coloredPath);

    // Grey path (initially hidden, will show right side on hover)
    const greyPath = createSVGElement('path', {
      d: '',
      stroke: '#d1d5db',
      'stroke-width': '2',
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    linesGroup.appendChild(greyPath);

    linePaths.push({ series, coloredPath, greyPath });

    // Add endpoint circle (solid colored, same size as hover)
    const lastPoint = series.data[series.data.length - 1];
    const circle = createSVGElement('circle', {
      cx: scaleXFn(lastPoint.time).toString(),
      cy: scaleYFn(lastPoint.value).toString(),
      r: '4',
      fill: series.color
    });
    svg.appendChild(circle);
    endpointCircles.push(circle);
  });

  // Create invisible overlay for mouse tracking
  const overlay = createSVGElement(
    'rect',
    {
      x: padding.left.toString(),
      y: padding.top.toString(),
      width: chartWidth.value.toString(),
      height: chartHeight.value.toString(),
      fill: 'transparent'
    },
    { cursor: 'crosshair' }
  );
  svg.appendChild(overlay);

  let hoverCircles: SVGCircleElement[] = [];
  let hoverLabels: (SVGRectElement | SVGTextElement)[] = [];
  let verticalLine: SVGLineElement | null = null;
  let dateLabel: SVGTextElement | null = null;

  overlay.addEventListener('mousemove', e => {
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest time point
    const timeAtMouse =
      timeRange.value.min +
      ((mouseX - padding.left) / chartWidth.value) * timeRange.value.range;

    // Find closest data point index
    const dataIndex = dataSeries.value[0].data.reduce((closest, point, idx) => {
      const currentDiff = Math.abs(point.time - timeAtMouse);
      const closestDiff = Math.abs(
        dataSeries.value[0].data[closest].time - timeAtMouse
      );
      return currentDiff < closestDiff ? idx : closest;
    }, 0);

    const selectedTime = dataSeries.value[0].data[dataIndex].time;
    const x = scaleXFn(selectedTime);

    // Clean up old hover elements
    cleanupElements(hoverCircles, hoverLabels, verticalLine, dateLabel);
    hoverCircles = [];
    hoverLabels = [];

    // Hide endpoint circles during hover
    endpointCircles.forEach(c => c.setAttribute('display', 'none'));

    // Update legend by setting hover index (reactive update)
    hoveredDataIndex.value = dataIndex;

    // Update line paths to split at hover point
    linePaths.forEach(({ series, coloredPath, greyPath }) => {
      const leftPathData = createPathData(
        series.data.slice(0, dataIndex + 1),
        scaleXFn,
        scaleYFn
      );
      const rightPathData = createPathData(
        series.data.slice(dataIndex),
        scaleXFn,
        scaleYFn
      );

      coloredPath.setAttribute('d', leftPathData);
      greyPath.setAttribute('d', rightPathData);
    });

    // Draw vertical line (solid)
    verticalLine = createSVGElement(
      'line',
      {
        x1: x.toString(),
        y1: padding.top.toString(),
        x2: x.toString(),
        y2: (padding.top + chartHeight.value).toString(),
        stroke: '#d1d5db',
        'stroke-width': '1'
      },
      { pointerEvents: 'none' }
    );
    svg.appendChild(verticalLine);

    // Calculate actual maximum label width by measuring all labels
    const labelPadding = 8;
    const maxLabelWidth = Math.max(
      ...dataSeries.value.map(series => {
        const value = series.data[dataIndex].value;
        const labelText = `${series.label.split(':')[0]} $${value.toFixed(1)}`;
        const textWidth = measureText(svg, labelText, '13');
        return textWidth + labelPadding * 2 + 23; // 15 + 8 offset
      })
    );

    // Determine if labels should be on left or right based on actual max label width
    const spaceOnRight = padding.left + chartWidth.value - x;
    const labelsOnLeft = spaceOnRight < maxLabelWidth;

    // Draw date label at the top of the vertical line (right or left side)
    dateLabel = createSVGElement(
      'text',
      {
        x: labelsOnLeft ? (x - 8).toString() : (x + 8).toString(),
        y: (padding.top - 10).toString(),
        fill: '#6b7280',
        'font-size': '15',
        'text-anchor': labelsOnLeft ? 'end' : 'start'
      },
      { pointerEvents: 'none' }
    );
    dateLabel.textContent = formatTime(selectedTime);
    svg.appendChild(dateLabel);

    // Collect and sort label positions by y (top to bottom)
    const labelHeight = 20;
    const minSpacing = 2;
    const labelData = dataSeries.value
      .map(series => ({
        value: series.data[dataIndex].value,
        y: scaleYFn(series.data[dataIndex].value),
        series
      }))
      .sort((a, b) => a.y - b.y);

    // Adjust positions to avoid overlaps
    const adjustedPositions = labelData.reduce((positions, data, i) => {
      const prevBottom = i > 0 ? positions[i - 1] + labelHeight / 2 : -Infinity;
      const currentTop = data.y - labelHeight / 2;
      const adjustedY =
        currentTop < prevBottom + minSpacing
          ? prevBottom + minSpacing + labelHeight / 2
          : data.y;
      return [...positions, adjustedY];
    }, [] as number[]);

    // Draw circles and labels with adjusted positions
    labelData.forEach((data, i) => {
      const { value, y, series } = data;
      const adjustedLabelY = adjustedPositions[i];

      // Draw hover circle
      const circle = createSVGElement(
        'circle',
        {
          cx: x.toString(),
          cy: y.toString(),
          r: '4',
          fill: series.color
        },
        { pointerEvents: 'none' }
      );
      svg.appendChild(circle);
      hoverCircles.push(circle);

      // Draw label at hover point
      const labelText = `${series.label.split(':')[0]} $${value.toFixed(1)}`;
      const textWidth = measureText(svg, labelText, '13', 'bold');
      const bgWidth = textWidth + labelPadding * 2;

      const labelBgX = labelsOnLeft
        ? x - 15 - bgWidth - 8 + 14 + 2
        : x + 15 - 8;
      const labelX = labelBgX + labelPadding;

      // Draw background first (6px up from the dot)
      const labelBg = createSVGElement(
        'rect',
        {
          x: labelBgX.toString(),
          y: (adjustedLabelY - labelHeight / 2 - 6).toString(),
          width: bgWidth.toString(),
          height: labelHeight.toString(),
          fill: series.color,
          rx: '4'
        },
        { pointerEvents: 'none' }
      );
      svg.appendChild(labelBg);
      hoverLabels.push(labelBg);

      // Draw text on top of background (6px up from the dot)
      const label = createSVGElement(
        'text',
        {
          x: labelX.toString(),
          y: (adjustedLabelY - 6).toString(),
          fill: 'white',
          'font-size': '14',
          'dominant-baseline': 'middle',
          'text-anchor': 'start'
        },
        { pointerEvents: 'none' }
      );
      label.textContent = labelText;
      svg.appendChild(label);
      hoverLabels.push(label);
    });
  });

  overlay.addEventListener('mouseleave', () => {
    // Clean up hover elements
    cleanupElements(hoverCircles, hoverLabels, verticalLine, dateLabel);
    hoverCircles = [];
    hoverLabels = [];
    verticalLine = null;
    dateLabel = null;

    // Show endpoint circles again
    endpointCircles.forEach(c => c.setAttribute('display', 'block'));

    // Reset legend to show latest values (reactive update)
    hoveredDataIndex.value = null;

    // Reset line paths to full colored
    linePaths.forEach(({ series, coloredPath, greyPath }) => {
      coloredPath.setAttribute(
        'd',
        createPathData(series.data, scaleXFn, scaleYFn)
      );
      greyPath.setAttribute('d', '');
    });
  });
}

// Watch for dimension changes and redraw
watch([containerWidth, containerHeight, dataSeries], () => {
  if (containerWidth.value > 0 && containerHeight.value > 0) {
    drawChart();
  }
});

onMounted(() => {
  drawChart();
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <div class="flex items-center gap-2.5 px-1 py-3">
      <div
        v-for="series in currentPercentages"
        :key="series.id"
        class="flex items-center gap-1.5"
      >
        <div
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: series.color }"
        />
        {{ series.label }} <b>${{ series.percentage.toFixed(0) }}</b>
      </div>
    </div>
    <div ref="chartContainer" class="flex-1" />
  </div>
</template>
