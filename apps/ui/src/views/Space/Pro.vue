<script setup lang="ts">
import dayjs from 'dayjs';
import { TOKENS } from '@/composables/usePayment';
import { _n } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import { ChainId, Space } from '@/types';
import ICInfinity from '~icons/c/infinity.svg';
import ICPro from '~icons/c/pro.svg';
import ICCheck from '~icons/heroicons-outline/check';

type SubscriptionLength = 'yearly' | 'monthly';
type TierPlan = 'basic' | 'pro' | 'custom';
type Feature = {
  [key in TierPlan | 'title']: string | number | boolean | Component;
};

const TIER_PLAN: TierPlan[] = ['basic', 'pro', 'custom'] as const;

const ACCEPTED_TOKENS_SYMBOL: string[] = ['USDC', 'USDT'] as const;

const PRO_PRICES: Record<ChainId, Record<SubscriptionLength, number>> = {
  1: {
    yearly: 6000,
    monthly: 600
  },
  11155111: { yearly: 1, monthly: 0.1 }
} as const;

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Can I switch between monthly and annual billing plans?',
    answer: 'placeholder answer ...'
  },
  {
    question:
      'What happens if I exceed the daily or monthly proposal limit in the Basic plan?',
    answer: 'placeholder answer ...'
  },
  {
    question: 'Does the Pro plan include whitelabel options?',
    answer: 'placeholder answer ...'
  }
] as const;

defineProps<{
  space: Space;
}>();

const { limits } = useSettings();
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();

const currentQuestion = ref<number>();
const subscriptionLength = ref<SubscriptionLength>('yearly');
const modalPaymentOpen = ref(false);

const paymentNetwork = computed(() => {
  return metadataNetwork === 's' ? 1 : 11155111;
});

const prices = computed(() => {
  return PRO_PRICES[paymentNetwork.value];
});

const tokens = computed(() => {
  return TOKENS[paymentNetwork.value].filter(t => {
    return ACCEPTED_TOKENS_SYMBOL.includes(t.symbol);
  });
});

const features = computed<
  Record<string, { title: string; features: Feature[] }>
>(() => {
  return {
    proposals: {
      title: 'Proposals',
      features: [
        {
          title: 'Daily proposals',
          basic: limits.value['space.default.proposal_limit_per_day'],
          pro: limits.value['space.turbo.proposal_limit_per_day'],
          custom: ICInfinity
        },
        {
          title: 'Monthly proposals',
          basic: limits.value['space.default.proposal_limit_per_month'],
          pro: limits.value['space.turbo.proposal_limit_per_month'],
          custom: ICInfinity
        },
        {
          title: 'Proposal character limit',
          basic: limits.value['space.default.body_limit'],
          pro: limits.value['space.turbo.body_limit'],
          custom: ICInfinity
        }
      ]
    },
    choices: {
      title: 'Voting',
      features: [
        {
          title: 'Choices',
          basic: limits.value['space.default.choices_limit'],
          pro: limits.value['space.turbo.choices_limit'],
          custom: ICInfinity
        },
        {
          title: 'Voting strategies',
          basic: limits.value['space.default.strategies_limit'],
          pro: limits.value['space.turbo.strategies_limit'],
          custom: ICInfinity
        }
      ]
    },
    tools: {
      title: 'Management tools',
      features: [
        {
          title: 'Delegates dashboard',
          basic: '-',
          pro: true,
          custom: true
        }
      ]
    },
    customization: {
      title: 'Support and customization',
      features: [
        {
          title: 'Whitelabel',
          basic: '-',
          pro: true,
          custom: true
        },
        {
          title: 'Priority support',
          basic: '-',
          pro: true,
          custom: true
        },
        {
          title: 'Early access to new features',
          basic: '-',
          pro: true,
          custom: true
        },
        {
          title: 'Custom interface',
          basic: '-',
          pro: '-',
          custom: true
        }
      ]
    }
  };
});

function toggleQuestion(id: number) {
  currentQuestion.value = currentQuestion.value === id ? undefined : id;
}

async function handleTurboClick() {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  modalPaymentOpen.value = true;
}
</script>
<template>
  <div>
    <div
      class="text-center flex flex-col items-center justify-center h-[295px] gap-3 relative overflow-hidden"
    >
      <div class="hero hero-bg" />
      <div
        class="text-[56px] leading-[48px] text-skin-heading font-semibold space-x-2"
      >
        The power of
        <ICPro class="h-[46px] inline" />
      </div>
      <div class="max-w-[290px] text-md leading-6">
        Pick the plan that works best for your organization.
      </div>
      <div
        class="flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg"
      >
        <button
          v-for="(_, p) in PRO_PRICES"
          :key="p"
          :class="[
            'rounded-full py-1 text-skin-link',
            { 'bg-skin-active-bg': subscriptionLength === p }
          ]"
          @click="subscriptionLength = p"
        >
          <div v-if="p === 'yearly'" class="pl-3 pr-1 flex gap-1">
            Annual
            <div
              class="bg-orange-300/20 border border-orange-300 rounded-full px-2 text-sm leading-[18px]"
            >
              -16%
            </div>
          </div>
          <div v-else class="px-3" v-text="'Monthly'" />
        </button>
      </div>
    </div>
    <div class="flex flex-col md:flex-row p-4 pb-6 gap-3 justify-stretch">
      <div class="border rounded-lg p-3.5 flex flex-col gap-3.5 grow">
        <div class="flex flex-col sm:flex-row justify-between gap-2.5">
          <div class="flex flex-col justify-between">
            <ICPro class="mb-2 w-[54px] h-[28px] text-skin-heading" />
            <div class="max-w-[318px] leading-5">
              Empower your Snapshot space with advanced governance tools.
            </div>
          </div>

          <div
            class="flex flex-col justify-between items-start sm:items-end gap-1"
          >
            <div>
              <span class="text-xl text-skin-heading font-semibold leading-8">
                ${{ _n(prices[subscriptionLength]) }} </span
              >/{{ subscriptionLength === 'yearly' ? 'yr' : 'mo' }}
            </div>
            <UiButton class="w-full" primary @click="handleTurboClick">
              {{ space.turbo ? 'Extend' : 'Upgrade' }}
            </UiButton>
          </div>
        </div>
        <hr />
        <ul
          class="leading-[18px] space-y-2 gap-5 list-disc list-outside md:columns-2 w-full text-skin-heading ml-2.5"
        >
          <li>Increase proposal limits effortlessly.</li>
          <li>More voting options and flexibility.</li>
          <li>Manage delegates with ease.</li>
          <li>Customize your space with support.</li>
        </ul>
      </div>

      <div
        class="border rounded-lg p-3.5 flex flex-col bg-skin-input-bg md:basis-[236px]"
      >
        <div class="text-skin-heading font-semibold text-lg leading-6 mb-1.5">
          Custom plan
        </div>
        <div class="leading-[18px] grow mb-3.5">
          Customize your plan and enjoy all the benefits without limits.
        </div>
        <div>
          <UiButton class="!bg-transparent">Talk to sales</UiButton>
        </div>
      </div>
    </div>
    <div
      class="flex border-b bg-skin-bg px-4 py-2 text-skin-heading uppercase font-semibold text-sm sticky top-[71px] lg:top-[72px]"
    >
      <div class="basis-[250px] grow">Features</div>
      <div
        v-for="tier in TIER_PLAN"
        :key="tier"
        class="feature-value-col"
        v-text="tier"
      />
    </div>
    <div
      v-for="(details, category) in features"
      :key="category"
      class="border-b"
    >
      <div
        class="border-b px-4 uppercase pt-5 pb-2 font-semibold text-sm"
        v-text="details.title"
      />
      <div
        v-for="(feature, i) in details.features"
        :key="i"
        :class="[
          `flex mx-4 text-skin-heading py-3.5 leading-[18px] items-center`,
          { 'border-t': i > 0 }
        ]"
      >
        <div class="basis-[250px] grow" v-text="feature.title" />
        <div
          v-for="type in ['basic', 'pro', 'custom']"
          :key="type"
          class="feature-value-col"
        >
          <component
            :is="feature[type]"
            v-if="typeof feature[type] === 'object'"
            class="mx-auto text-skin-text"
          />
          <ICCheck
            v-else-if="feature[type] === true"
            class="mx-auto text-skin-success"
          />
          <template v-else>
            {{
              typeof feature[type] === 'number'
                ? _n(feature[type])
                : feature[type]
            }}
          </template>
        </div>
      </div>
    </div>
    <div class="hidden md:flex items-center mx-4 py-3.5">
      <div class="basis-[250px] grow"></div>
      <div class="feature-value-col"></div>
      <div class="feature-value-col">
        <UiButton class="primary" @click="handleTurboClick">{{
          space.turbo ? 'Extend' : 'Upgrade'
        }}</UiButton>
      </div>
      <div class="feature-value-col">
        <UiButton>Talk to sales</UiButton>
      </div>
    </div>
    <div class="border-b p-4 pt-[40px] space-y-[2px]">
      <h3 class="leading-6">Questions?</h3>
      <div>Frequently asked questions</div>
    </div>
    <div class="border-b mb-4">
      <div
        v-for="(question, i) in FAQ"
        :key="i"
        :class="['mx-4 space-y-2 leading-6 text-md', { 'border-t': i > 0 }]"
      >
        <button
          type="button"
          class="flex items-center py-4 w-full text-left gap-2"
          :class="{ 'pb-0': currentQuestion === i }"
          @click="toggleQuestion(i)"
        >
          <IH-chevron-down
            v-if="currentQuestion === i"
            class="text-skin-text size-[16px]"
          />
          <IH-chevron-right v-else class="text-skin-text size-[16px]" />
          <div class="text-skin-heading" v-text="question.question" />
        </button>
        <div
          v-if="currentQuestion === i"
          class="pb-4 pl-4"
          v-text="question.answer"
        />
      </div>
    </div>
    <ModalPayment
      :open="modalPaymentOpen"
      :tokens="tokens"
      :network="paymentNetwork"
      :quantity-label="subscriptionLength === 'yearly' ? 'Years' : 'Months'"
      :amount="prices[subscriptionLength]"
      :barcode-payload="{ type: 'turbo', params: { space: space.id } }"
      @close="modalPaymentOpen = false"
    >
      <template #summary="{ quantity }">
        <div class="flex justify-between">
          <div>
            {{ subscriptionLength === 'yearly' ? 'Annual' : 'Monthly' }} plan
          </div>
          <ICPro class="h-[15px] w-auto inline text-skin-heading" />
        </div>
        <div class="flex justify-between">
          <div>End date</div>
          <div>
            {{
              dayjs(new Date())
                .add(
                  quantity,
                  subscriptionLength === 'yearly' ? 'year' : 'month'
                )
                .format('D MMM YYYY')
            }}
            ({{ quantity }}
            {{ subscriptionLength === 'yearly' ? 'year' : 'month'
            }}{{ quantity > 1 ? 's' : '' }})
          </div>
        </div>
      </template>
    </ModalPayment>
  </div>
</template>

<style lang="scss" scoped>
.hero-bg {
  @apply absolute h-full w-full z-[-1] opacity-50 scale-150;

  &:after {
    @apply bg-gradient-to-t from-skin-bg to-transparent via-skin-bg via-30%;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    border: 1px solid red;
  }
}

.feature-value-col {
  @apply grow shrink-0 text-center basis-[60px] max-w-[300px];
}
</style>
