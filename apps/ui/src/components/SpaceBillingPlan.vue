<script setup lang="ts">
import dayjs from 'dayjs';
import { PRO_MONTHLY_PRICES, SNAPSHOT_PLUS_FEES } from '@/helpers/constants';
import { _n, _rt, formatPlusUsage } from '@/helpers/utils';
import { Space } from '@/types';

type Plan = 'basic' | 'plus' | 'pro';

const PLAN_NAMES: Record<Plan, string> = {
  basic: 'Basic',
  plus: 'Plus',
  pro: 'Pro'
};

const PRO_PRICE = `$${PRO_MONTHLY_PRICES.monthly} / month or $${(PRO_MONTHLY_PRICES.yearly * 12).toLocaleString('en-US')} / year`;
const PLUS_PRICES = `${SNAPSHOT_PLUS_FEES.proposal} ETH / proposal · ${SNAPSHOT_PLUS_FEES.vote} ETH / vote`;

const props = defineProps<{ space: Space }>();

const emit = defineEmits<{
  (e: 'addCredits'): void;
}>();

// The current plan is the main card, the other plans one row each below it
const currentPlan = computed<Plan>(() => {
  if (props.space.plus) return 'plus';
  return props.space.turbo ? 'pro' : 'basic';
});
const otherPlans = computed(() =>
  (Object.keys(PLAN_NAMES) as Plan[]).filter(plan => plan !== currentPlan.value)
);

const credits = computed(() => props.space.credits ?? 0);
const balance = computed(
  () =>
    `${_n(Math.abs(credits.value), 'standard', { maximumFractionDigits: 6 })} ETH`
);
const expiration = computed(() =>
  props.space.turbo_expiration
    ? dayjs(props.space.turbo_expiration * 1000).format('MMM D, YYYY')
    : ''
);
const hasProEnded = computed(
  () =>
    currentPlan.value !== 'pro' &&
    !!props.space.turbo_expiration &&
    props.space.turbo_expiration < Date.now() / 1e3
);

const card = computed(() => {
  if (currentPlan.value === 'pro') {
    return {
      value: expiration.value || 'Active',
      detail: expiration.value
        ? _rt(props.space.turbo_expiration)
        : 'Unknown expiration date',
      footer: `Subscription · ${PRO_PRICE}`
    };
  }

  if (currentPlan.value === 'plus') {
    return {
      value: balance.value,
      detail: `${formatPlusUsage(credits.value)} left`,
      footer: `Pay per use · ${PLUS_PRICES}`
    };
  }

  return { value: 'Free', detail: 'Standard limits and features', footer: '' };
});

const summaries = computed<Record<Plan, string>>(() => ({
  basic: 'Free',
  plus: !credits.value
    ? PLUS_PRICES
    : `${balance.value}${credits.value < 0 ? ' owed' : ''} · ${PLUS_PRICES}`,
  pro: hasProEnded.value ? `Ended ${expiration.value}` : PRO_PRICE
}));
</script>

<template>
  <div class="space-y-3">
    <div class="border rounded-xl">
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <UiBadgeSpace
            v-if="currentPlan !== 'basic'"
            turbo
            :plus="currentPlan === 'plus'"
            :verified="false"
            :flagged="false"
          />
          <h5
            class="text-lg font-semibold text-skin-heading"
            v-text="PLAN_NAMES[currentPlan]"
          />
          <span class="ml-auto text-sm">Active</span>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <div
              class="text-xl font-semibold leading-none mb-1.5 text-skin-heading"
              v-text="card.value"
            />
            <div class="text-sm" v-text="card.detail" />
          </div>
          <UiButton
            v-if="currentPlan === 'plus'"
            class="primary"
            @click="emit('addCredits')"
          >
            Add credits
          </UiButton>
          <UiButton
            v-else-if="currentPlan === 'pro'"
            class="primary"
            :to="{ name: 'space-pro' }"
          >
            Extend
          </UiButton>
        </div>
      </div>
      <div
        v-if="card.footer"
        class="border-t px-4 py-2.5 text-sm"
        v-text="card.footer"
      />
    </div>

    <div class="border rounded-xl divide-y">
      <div
        v-for="plan in otherPlans"
        :key="plan"
        class="px-4 py-3 flex items-center gap-2"
      >
        <UiBadgeSpace
          v-if="plan !== 'basic'"
          turbo
          :plus="plan === 'plus'"
          :verified="false"
          :flagged="false"
        />
        <div class="flex-1 truncate">
          <span
            class="font-semibold text-skin-heading"
            v-text="PLAN_NAMES[plan]"
          />
          <span class="text-sm"> · {{ summaries[plan] }}</span>
        </div>
        <button
          v-if="plan === 'plus'"
          type="button"
          class="text-skin-link"
          @click="emit('addCredits')"
        >
          Add credits
        </button>
        <AppLink
          v-else-if="plan === 'pro'"
          :to="{ name: 'space-pro' }"
          class="text-skin-link"
        >
          {{ hasProEnded ? 'Renew' : 'Upgrade' }}
        </AppLink>
      </div>
    </div>
  </div>
</template>
