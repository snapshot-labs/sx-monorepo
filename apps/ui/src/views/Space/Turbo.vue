<script setup lang="ts">
import { _n } from '@/helpers/utils';
import ICInfinity from '~icons/c/infinity.svg';
import ICTurbo from '~icons/c/turbo.svg';
import ICCheckCircle from '~icons/heroicons-outline/check-circle.vue';

type TierPlan = 'basic' | 'turbo' | 'custom';
type Feature = { [key in TierPlan | string]: string | number | Component };
type SubscriptionLength = 'monthly' | 'yearly';

const TIER_PLAN: TierPlan[] = ['basic', 'turbo', 'custom'] as const;

const TURBO_PRICES: Record<SubscriptionLength, number> = {
  yearly: 6000,
  monthly: 600
} as const;

const { limits } = useSettings();

const currentQuestion = ref<number>();
const subscriptionLength = ref<SubscriptionLength>('yearly');

function toggleQuestion(id: number) {
  currentQuestion.value = currentQuestion.value === id ? undefined : id;
}

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
          turbo: limits.value['space.turbo.proposal_limit_per_day'],
          custom: ICInfinity
        },
        {
          title: 'Monthly proposals',
          basic: limits.value['space.default.proposal_limit_per_month'],
          turbo: limits.value['space.turbo.proposal_limit_per_month'],
          custom: ICInfinity
        },
        {
          title: 'Proposal character limit',
          basic: limits.value['space.default.body_limit'],
          turbo: limits.value['space.turbo.body_limit'],
          custom: ICInfinity
        }
      ]
    },
    choices: {
      title: 'Choices',
      features: [
        {
          title: 'Choices',
          basic: limits.value['space.default.choices_limit'],
          turbo: limits.value['space.turbo.choices_limit'],
          custom: ICInfinity
        },
        {
          title: 'Voting strategies',
          basic: limits.value['space.default.strategies_limit'],
          turbo: limits.value['space.turbo.strategies_limit'],
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
          turbo: ICCheckCircle,
          custom: ICCheckCircle
        }
      ]
    },
    customization: {
      title: 'Support and customization',
      features: [
        {
          title: 'Whitelabel',
          basic: '-',
          turbo: ICCheckCircle,
          custom: ICCheckCircle
        },
        {
          title: 'Priority support',
          basic: '-',
          turbo: ICCheckCircle,
          custom: ICCheckCircle
        },
        {
          title: 'Early access to new features',
          basic: '-',
          turbo: ICCheckCircle,
          custom: ICCheckCircle
        },
        {
          title: 'Custom interface',
          basic: '-',
          turbo: ICCheckCircle,
          custom: ICCheckCircle
        }
      ]
    }
  };
});

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
    question: 'Does the Turbo plan include whitelabel options?',
    answer: 'placeholder answer ...'
  }
] as const;
</script>
<template>
  <div>
    <div
      class="text-center flex flex-col items-center justify-center h-[295px] gap-3 relative overflow-hidden"
    >
      <div class="hero hero-bg"></div>
      <div class="text-[56px] leading-[48px] text-skin-heading font-semibold">
        The power of
        <div
          class="bg-skin-heading text-skin-bg uppercase text-[46px] px-2 inline-block leading-[46px] rounded-lg -skew-x-[10deg] top-[-3px] relative"
        >
          pro
        </div>
      </div>
      <div class="max-w-[290px] text-md leading-6">
        Pick the plan that works best for your organization.
        <span class="underline text-skin-heading">Cancel anytime</span>
      </div>
      <div
        class="flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg"
      >
        <button
          v-for="p in Object.keys(TURBO_PRICES) as SubscriptionLength[]"
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
              -20%
            </div>
          </div>
          <div v-else class="px-3">Monthly</div>
        </button>
      </div>
    </div>
    <div class="flex flex-col md:flex-row p-4 pb-7 gap-3 justify-stretch">
      <div class="border rounded-lg p-3.5 flex flex-col gap-3.5 basis-2/3 grow">
        <div>
          <div class="float-right">
            <span class="text-xl text-skin-heading font-semibold">
              ${{ _n(TURBO_PRICES[subscriptionLength]) }} </span
            >/{{ subscriptionLength === 'yearly' ? 'yr' : 'mo' }}
          </div>
          <div
            class="inline-flex border rounded-full items-center gap-1 py-1 pl-2 pr-[10px] text-sm text-skin-heading leading-[18px]"
          >
            <IH-bolt class="size-[14px]" />Most popular
          </div>
          <ICTurbo class="mt-3 mb-2 text-skin-heading w-[102px] h-[31px]" />
          <div class="max-w-[318px] leading-5">
            Empower your Snapshot space with advanced governance tools.
          </div>
        </div>
        <UiButton class="w-full" primary>Upgrade</UiButton>
        <hr />
        <div
          class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-5 text-skin-heading"
        >
          <ul class="leading-[18px] space-y-2.5">
            <li>
              {{ _n(limits['space.turbo.proposal_limit_per_day']) }}
              proposals per day
            </li>
            <li>
              {{ _n(limits['space.turbo.proposal_limit_per_month']) }} proposals
              per month
            </li>
            <li>
              {{ _n(limits['space.turbo.body_limit']) }} Proposal character
              limit
            </li>
            <li>
              {{ _n(limits['space.turbo.choices_limit']) }} voting options per
              proposal
            </li>
            <li>
              {{ _n(limits['space.turbo.strategies_limit']) }} customizable
              voting strategies
            </li>
          </ul>

          <ul class="leading-[18px] space-y-2.5">
            <li>Enhanced visibility</li>
            <li>Enhanced monitoring service</li>
            <li>Promote your first proposal</li>
            <li>Dedicated Telegram support</li>
            <li>Support non-premium network</li>
          </ul>
        </div>
      </div>
      <div
        class="border rounded-lg p-3.5 flex flex-col bg-skin-input-bg basis-1/3"
      >
        <ICInfinity class="size-[20px] mb-1 text-skin-heading" />
        <div class="text-skin-heading font-semibold text-lg leading-6 mb-1.5">
          Custom plan
        </div>
        <div class="leading-[18px] grow mb-3.5">
          Customize your plan and enjoy all the benefits without limits.
        </div>
        <UiButton class="w-full !bg-transparent">Talk to sales</UiButton>
      </div>
    </div>
    <div
      class="flex border-b px-4 pb-1 text-skin-heading uppercase font-semibold text-sm"
    >
      <div class="basis-[250px]">Features</div>
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
        <div class="basis-[250px]" v-text="feature.title" />
        <div
          v-for="type in ['basic', 'turbo', 'custom']"
          :key="type"
          class="feature-value-col"
        >
          <component
            :is="feature[type]"
            v-if="typeof feature[type] === 'object'"
            class="mx-auto text-skin-text"
          />
          <div
            v-else
            v-text="
              typeof feature[type] === 'number'
                ? _n(feature[type])
                : feature[type]
            "
          />
        </div>
      </div>
    </div>
    <div class="hidden md:flex space-x-4 mx-4 py-3.5">
      <div class="basis-[250px]"></div>
      <UiButton class="feature-value-col" disabled>You're on basic</UiButton>
      <UiButton class="feature-value-col">Upgrade</UiButton>
      <UiButton class="feature-value-col">Talk to sales</UiButton>
    </div>
    <div class="border-b p-4 pt-[40px] space-y-[2px]">
      <h3 class="leading-6">Questions?</h3>
      <div>Frequently asked questions</div>
    </div>
    <div class="border-b mb-4">
      <div
        v-for="(question, i) in FAQ"
        :key="i"
        :class="[
          'mx-4 py-4 space-y-2 leading-6 text-md',
          { 'border-t': i > 0 }
        ]"
      >
        <button
          type="button"
          class="flex items-center w-full text-left"
          @click="toggleQuestion(i)"
        >
          <div class="flex-auto text-skin-heading" v-text="question.question" />
          <IH-chevron-up
            v-if="currentQuestion === i"
            class="text-skin-text size-[16px]"
          />
          <IH-chevron-down v-else class="text-skin-text size-[16px]" />
        </button>
        <div v-if="currentQuestion === i" v-text="question.answer" />
      </div>
    </div>
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
  @apply grow shrink-0 text-center basis-[60px];
}
</style>
