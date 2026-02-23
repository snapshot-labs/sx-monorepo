<script setup lang="ts">
import { ChartTick } from '@/components/LineChart.vue';
import UiColumnHeader from '@/components/Ui/ColumnHeader.vue';
import { _n, _t, shortenAddress } from '@/helpers/utils';
import { Proposal as ProposalType } from '@/types';

type TradeSide = 'buy-approve' | 'buy-reject' | 'sell-approve' | 'sell-reject';

type Trade = {
  trader: { id: string; name: string };
  side: TradeSide;
  created: number;
  amount: number;
  price: number;
};

const SIDE_LABELS: Record<TradeSide, string> = {
  'buy-approve': 'Buy approve',
  'buy-reject': 'Buy reject',
  'sell-approve': 'Sell approve',
  'sell-reject': 'Sell reject'
};

const CHART_SERIES = [
  { label: 'If approved', color: 'success' },
  { label: 'If rejected', color: 'danger' },
  { label: 'GNO price', color: 'text' }
].map(({ label, color }) => ({
  label,
  stroke: `stroke-skin-${color}`,
  fill: `fill-skin-${color}`,
  bg: `bg-skin-${color}`
}));

const props = defineProps<{
  proposal: ProposalType;
}>();

const tradesHeader = ref<HTMLElement | null>(null);
const { x: tradesHeaderX } = useScroll(tradesHeader);

function generateTicks(): ChartTick[] {
  const { start, max_end } = props.proposal;
  const duration = max_end - start;
  const steps = 40;
  const ticks: ChartTick[] = [];
  let prices = [230, 230, 230];

  for (let i = 0; i <= steps; i++) {
    const phase = i / steps;
    prices = [
      Math.max(
        120,
        Math.min(
          400,
          prices[0] + (Math.random() - 0.3) * 30 + Math.sin(phase * 8) * 10
        )
      ),
      Math.max(
        80,
        Math.min(
          350,
          prices[1] + (Math.random() - 0.7) * 28 - Math.cos(phase * 6) * 8
        )
      ),
      Math.max(
        100,
        Math.min(
          380,
          prices[2] + (Math.random() - 0.5) * 22 + Math.sin(phase * 12) * 6
        )
      )
    ];
    ticks.push({
      timestamp: start + Math.floor((duration * i) / steps),
      values: prices.map(p => Math.round(p * 100) / 100)
    });
  }
  return ticks;
}

const MOCK_TRADES: Omit<Trade, 'created'>[] = [
  {
    trader: {
      id: '0x1234567890abcdef1234567890abcdef12345678',
      name: 'vitalik.eth'
    },
    side: 'buy-approve',
    amount: 150,
    price: 248
  },
  {
    trader: { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: '' },
    side: 'buy-reject',
    amount: 42,
    price: 215
  },
  {
    trader: {
      id: '0x2345678901bcdef02345678901bcdef023456789',
      name: 'alice.eth'
    },
    side: 'buy-approve',
    amount: 310,
    price: 255
  },
  {
    trader: { id: '0x3456789012cdef013456789012cdef0134567890', name: '' },
    side: 'sell-reject',
    amount: 85,
    price: 208
  },
  {
    trader: {
      id: '0x456789abcd0123456789abcd0123456789abcd01',
      name: 'bob.eth'
    },
    side: 'buy-approve',
    amount: 500,
    price: 262
  },
  {
    trader: {
      id: '0x567890bcde1234567890bcde1234567890bcde12',
      name: 'dao-whale.eth'
    },
    side: 'buy-reject',
    amount: 220,
    price: 210
  },
  {
    trader: { id: '0x6789abcdef23456789abcdef23456789abcdef23', name: '' },
    side: 'sell-approve',
    amount: 175,
    price: 250
  },
  {
    trader: {
      id: '0x7890bcde0f34567890bcde0f34567890bcde0f34',
      name: 'charlie.eth'
    },
    side: 'buy-approve',
    amount: 63,
    price: 260
  },
  {
    trader: { id: '0x890abcdef045678901abcdef045678901abcdef0', name: '' },
    side: 'sell-reject',
    amount: 1200,
    price: 205
  },
  {
    trader: {
      id: '0x90abcdef0156789012bcdef0156789012bcdef01',
      name: 'defi-chad.eth'
    },
    side: 'buy-approve',
    amount: 95,
    price: 265
  }
];

const chartTicks = generateTicks();

const trades = computed<Trade[]>(() => {
  const { start, max_end } = props.proposal;
  const duration = max_end - start;
  return MOCK_TRADES.map((t, i) => ({
    ...t,
    created: start + Math.floor((duration * (i + 1)) / (MOCK_TRADES.length + 1))
  })).sort((a, b) => b.created - a.created);
});

const totalVolume = computed(() =>
  trades.value.reduce((sum, t) => sum + t.amount * t.price, 0)
);

const formatValue = (v: number) => `$${v.toFixed(2)}`;
</script>

<template>
  <div>
    <LineChart
      :ticks="chartTicks"
      :series="CHART_SERIES"
      :start="proposal.start"
      :end="proposal.max_end"
      :format-value="formatValue"
      :start-from-zero="false"
      class="border-b pb-3"
    />
  </div>
  <UiColumnHeader
    :ref="
      ref =>
        (tradesHeader =
          (ref as InstanceType<typeof UiColumnHeader> | null)?.container ??
          null)
    "
    class="!px-0 overflow-hidden"
  >
    <div class="flex space-x-3 min-w-[735px] w-full">
      <div class="ml-4 max-w-[218px] w-[218px] truncate">Trader</div>
      <div class="grow w-[40%]">Side</div>
      <div class="max-w-[144px] w-[144px] truncate">Date</div>
      <div class="max-w-[144px] w-[144px] text-right truncate">Amount</div>
      <div class="min-w-[44px] lg:w-[60px]" />
    </div>
  </UiColumnHeader>
  <UiScrollerHorizontal
    @scroll="(target: HTMLElement) => (tradesHeaderX = target.scrollLeft)"
  >
    <div class="min-w-[735px]">
      <div
        v-for="(trade, i) in trades"
        :key="i"
        class="border-b flex space-x-3"
      >
        <div
          class="right-0 h-[8px] absolute opacity-20"
          :style="{
            width: `${((100 / totalVolume) * trade.amount * trade.price).toFixed(2)}%`
          }"
          :class="
            trade.side.includes('approve')
              ? 'bg-skin-success'
              : 'bg-skin-danger'
          "
        />
        <div
          class="leading-[22px] !ml-4 py-3 max-w-[218px] w-[218px] flex items-center space-x-3 truncate"
        >
          <UiStamp :id="trade.trader.id" :size="32" />
          <div class="flex flex-col truncate">
            <h4
              class="truncate"
              v-text="trade.trader.name || shortenAddress(trade.trader.id)"
            />
            <UiAddress
              :address="trade.trader.id"
              class="text-[17px] text-skin-text truncate"
            />
          </div>
        </div>
        <div class="grow w-[40%] flex items-center truncate leading-[22px]">
          <h4
            :class="
              trade.side.includes('approve')
                ? 'text-skin-success'
                : 'text-skin-danger'
            "
          >
            {{ SIDE_LABELS[trade.side] }}
          </h4>
        </div>
        <div
          class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center truncate"
        >
          <TimeRelative v-slot="{ relativeTime }" :time="trade.created">
            <h4>{{ relativeTime }}</h4>
          </TimeRelative>
          <div class="text-[17px]">
            {{ _t(trade.created, 'MMM D, YYYY') }}
          </div>
        </div>
        <div
          class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center text-right truncate"
        >
          <h4 class="text-skin-link truncate">{{ _n(trade.amount) }} GNO</h4>
          <div class="text-[17px]">${{ _n(trade.amount * trade.price) }}</div>
        </div>
        <div class="min-w-[44px] lg:w-[60px] flex items-center justify-center">
          <UiDropdown>
            <template #button>
              <button type="button">
                <IH-dots-horizontal class="text-skin-link" />
              </button>
            </template>
            <template #items>
              <UiDropdownItem to="#">
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View on block explorer
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>
    </div>
  </UiScrollerHorizontal>
</template>
