<script setup lang="ts">
import { PLANS } from '@/helpers/keycard';
import { PlanId } from '@/helpers/keycard/types';
import { _n } from '@/helpers/utils';

const props = defineProps<{
  open: boolean;
  currentPlan: PlanId;
  upgradePlan: (plan: PlanId) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUiStore();

const step = ref<'select' | 'paying' | 'success'>('select');
const selectedId = ref<PlanId | null>(null);

const selectedPlan = computed(() =>
  PLANS.find(plan => plan.id === selectedId.value)
);

const currentPrice = computed(
  () => PLANS.find(plan => plan.id === props.currentPlan)?.price ?? 0
);

// Only true upgrades are selectable — never present a downgrade as a payment.
function isDisabled(plan: (typeof PLANS)[number]) {
  return plan.price <= currentPrice.value;
}

function planSummary(plan: (typeof PLANS)[number]) {
  return `${_n(plan.quotaPerApp, 'compact')} requests / mo per app · ${plan.rateLimit} · ${plan.support}`;
}

async function handlePayClick() {
  if (!selectedPlan.value) return;

  try {
    step.value = 'paying';
    await props.upgradePlan(selectedPlan.value.id);
    step.value = 'success';
  } catch (err) {
    console.error('Failed to upgrade plan', err);
    uiStore.addNotification(
      'error',
      'An error occurred while processing your payment, please try again.'
    );
    step.value = 'select';
  }
}

watch(
  () => props.open,
  open => {
    if (open) return;

    step.value = 'select';
    selectedId.value = null;
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="step !== 'paying'" @close="emit('close')">
    <template #header>
      <h3
        v-text="step === 'success' ? 'Payment successful' : 'Upgrade your plan'"
      />
    </template>
    <div v-if="step === 'select'" class="p-4 space-y-3">
      <button
        v-for="plan in PLANS"
        :key="plan.id"
        type="button"
        :class="[
          'border rounded-lg px-4 py-3 w-full',
          {
            'border-skin-link': selectedId === plan.id,
            'opacity-40 cursor-not-allowed': isDisabled(plan)
          }
        ]"
        :disabled="isDisabled(plan)"
        :aria-pressed="selectedId === plan.id"
        @click="selectedId = plan.id"
      >
        <div class="flex gap-2 justify-between w-full">
          <div class="flex flex-1 items-center gap-x-2 flex-wrap">
            <h3 class="text-start" v-text="plan.name" />
            <div
              v-if="plan.popular"
              class="bg-skin-border text-sm rounded-full px-2"
            >
              Popular
            </div>
            <div
              v-if="plan.id === currentPlan"
              class="bg-skin-border text-sm rounded-full px-2"
            >
              Current
            </div>
          </div>
          <div class="flex items-center justify-end space-x-1 flex-wrap">
            <h2>${{ plan.price }}</h2>
            <span class="text-sm text-skin-text">/ month</span>
          </div>
        </div>
        <div
          class="text-sm text-start leading-[18px]"
          v-text="planSummary(plan)"
        />
      </button>
    </div>
    <div
      v-else-if="step === 'paying'"
      class="p-4 py-8 flex flex-col items-center gap-3 text-center"
    >
      <UiLoading />
      <h4 class="text-skin-heading">Processing payment</h4>
      <div class="text-sm leading-[18px] max-w-[280px]">
        Confirming your payment of ${{ selectedPlan?.price }} for the
        {{ selectedPlan?.name }} plan.
      </div>
    </div>
    <div v-else class="p-4 py-8 text-center">
      <h4
        class="font-semibold text-skin-heading text-lg flex flex-col items-center gap-2 mb-3"
      >
        Upgraded to
        <div class="inline-block text-skin-bg bg-skin-link rounded-full px-2">
          <UiEyebrow class="text-skin-bg">{{ selectedPlan?.name }}</UiEyebrow>
        </div>
      </h4>
      <div>
        Your new limits are active immediately across all your API keys.
      </div>
    </div>
    <template v-if="step !== 'paying'" #footer>
      <UiButton
        v-if="step === 'select'"
        class="w-full"
        primary
        :disabled="!selectedPlan"
        @click="handlePayClick"
      >
        <template v-if="selectedPlan">
          Pay ${{ selectedPlan.price }} / month
        </template>
        <template v-else>Select a plan</template>
      </UiButton>
      <UiButton v-else class="w-full" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
