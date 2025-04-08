<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { Space } from '@/types';
import ICAnnotation from '~icons/heroicons-outline/annotation';
import ICCheck from '~icons/heroicons-outline/check';
import ICFlag from '~icons/heroicons-outline/flag';
import ICGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IClightningBolt from '~icons/heroicons-outline/lightning-bolt';
import ICLink from '~icons/heroicons-outline/link';
import ICSparkles from '~icons/heroicons-outline/sparkles';
import ICStatusOnline from '~icons/heroicons-outline/status-online';
import ICSupport from '~icons/heroicons-outline/support';

type TierPlan = 'basic' | 'pro';
type Feature = {
  [key in TierPlan | string]: string | number | boolean | Component;
};
type SubscriptionLength = 'monthly' | 'yearly';

const USERS = [
  'aave.eth',
  'ens.eth',
  'safe.eth',
  'balancer.eth',
  'cvx.eth',
  'arbitrumfoundation.eth',
  'apecoin.eth'
];

const TIER_PLAN: TierPlan[] = ['basic', 'pro'] as const;

const FEATURES = [
  {
    name: 'Enhanced visibility',
    icon: ICStatusOnline,
    about: 'Increase your space’s ranking to reach a larger audience.'
  },
  {
    name: 'Delegates dashboard',
    icon: IClightningBolt,
    about:
      'Clearly display all delegates, sorted by voting power with profiles.'
  },
  {
    name: 'Discussions',
    icon: ICAnnotation,
    about: 'Support for Discourse discussions directly within the interface.'
  },
  {
    name: 'Custom domain',
    icon: ICLink,
    about: 'Personalize your space with your own domain, colors, and logo.'
  },
  {
    name: 'Priority support',
    icon: ICSupport,
    about:
      'Private Telegram group providing dedicated help within 4 hours or less.'
  },
  {
    name: 'Early access to new features',
    icon: ICSparkles,
    about:
      'Exclusive preview and early use of upcoming features and improvements.'
  },
  {
    name: 'Proposal monitoring',
    icon: ICFlag,
    about:
      'Rapid detection and review of spam or malicious proposals within 2 hours.'
  },
  {
    name: 'Support non-premium network',
    icon: ICGlobeAlt,
    about: 'Choose between premium or standard networks for your strategies.'
  }
];

defineProps<{ space: Space }>();

const { limits } = useSettings();

const subscriptionLength = ref<SubscriptionLength>('yearly');

const features = computed<Feature[]>(() => {
  return [
    {
      title: 'Daily proposals',
      basic: limits.value['space.default.proposal_limit_per_day'],
      pro: limits.value['space.turbo.proposal_limit_per_day']
    },
    {
      title: 'Monthly proposals',
      basic: limits.value['space.default.proposal_limit_per_month'],
      pro: limits.value['space.turbo.proposal_limit_per_month']
    },
    {
      title: 'Proposal character limit',
      basic: limits.value['space.default.body_limit'],
      pro: limits.value['space.turbo.body_limit']
    },
    {
      title: 'Choices',
      basic: limits.value['space.default.choices_limit'],
      pro: limits.value['space.turbo.choices_limit']
    },
    {
      title: 'Voting strategies',
      basic: limits.value['space.default.strategies_limit'],
      pro: limits.value['space.turbo.strategies_limit']
    }
  ];
});
</script>

<template>
  <div class="space-y-10">
    <div class="shapes px-4 py-8 bg-skin-border/40 flex items-center">
      <div class="text-center w-full">
        <span
          class="eyebrow mb-4 inline-block text-skin-bg bg-skin-link rounded-full px-2"
          >Snapshot Pro</span
        >
        <h1 class="mb-4">
          Level up your governance<br />
          with exclusive features
        </h1>
      </div>
    </div>

    <div class="mx-4">
      <div class="mx-auto max-w-[480px] mb-4 space-y-3">
        <a
          class="border rounded-lg px-4 py-3 flex"
          :class="subscriptionLength === 'monthly' && 'border-skin-link'"
          @click="subscriptionLength = 'monthly'"
        >
          <h3 class="flex-1">Pay monthly</h3>
          <div class="text-right flex items-center space-x-1">
            <h2>$600</h2>
            <span class="text-sm text-skin-text">/ month</span>
          </div>
        </a>
        <a
          class="border rounded-lg px-4 py-3 flex"
          :class="subscriptionLength === 'yearly' && 'border-skin-link'"
          @click="subscriptionLength = 'yearly'"
        >
          <div class="flex flex-1 items-center space-x-2">
            <h3>Pay yearly</h3>
            <div>
              <div class="bg-skin-border text-sm rounded-full px-2">
                Save $1,200
              </div>
            </div>
          </div>
          <div class="text-right flex items-center space-x-1">
            <h2>$500</h2>
            <span class="text-sm text-skin-text">/ month</span>
          </div>
        </a>
      </div>
      <div class="text-center">
        <UiButton class="primary">Upgrade {{ space.name }}</UiButton>
      </div>
    </div>

    <div>
      <h4 class="eyebrow mb-4 text-center">Trusted by leaders</h4>
      <div class="mx-auto px-4 text-center max-w-[740px] space-x-3">
        <UiStamp
          v-for="(user, i) in USERS"
          :id="`s:${user}`"
          :key="i"
          :size="48"
          class="!bg-skin-bg rounded-lg inline-block"
          type="space"
        />
      </div>
    </div>

    <div>
      <h4 class="eyebrow mb-4 text-center">Features</h4>
      <h2 class="mb-6 text-center text-[32px]">
        Everything you asked for, and more
      </h2>
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto px-4 max-w-[740px]"
      >
        <div
          v-for="(feature, i) in FEATURES"
          :key="i"
          class="bg-skin-border/20 border rounded-lg p-3 pb-4"
        >
          <component
            :is="feature.icon"
            class="text-skin-link inline-block w-[24px] h-[24px] mb-3"
          />
          <h4 class="text-skin-link text-[21px] mb-1">{{ feature.name }}</h4>
          <div>{{ feature.about }}</div>
        </div>
      </div>
    </div>

    <div>
      <h4 class="eyebrow mb-4 text-center">Limits</h4>
      <h2 class="mb-6 text-center text-[32px]">
        Take your governance to the max
      </h2>
      <div class="mx-4">
        <div class="border rounded-lg mx-auto max-w-[640px]">
          <div>
            <div
              class="flex rounded-t-lg border-b bg-skin-bg px-4 py-2 text-skin-heading uppercase font-semibold text-sm"
            >
              <div class="flex-1" />
              <div
                v-for="tier in TIER_PLAN"
                :key="tier"
                class="eyebrow w-[120px] text-center"
                v-text="tier"
              />
            </div>
            <div class="py-2">
              <div
                v-for="(feature, i) in features"
                :key="i"
                class="flex mx-4 text-skin-heading py-2 leading-5 items-center"
              >
                <div class="flex-1" v-text="feature.title" />
                <div
                  v-for="type in TIER_PLAN"
                  :key="type"
                  class="w-[120px] text-center"
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
          </div>
        </div>
      </div>
    </div>

    <div class="text-center shapes py-10 bg-skin-border/40">
      <h2 class="mb-4 text-[32px]">Get started today</h2>
      <UiButton class="primary">Upgrade {{ space.name }}</UiButton>
    </div>

    <div class="px-4 space-y-3">
      <a
        href="https://help.snapshot.box/en/collections/12372196-snapshot-pro"
        target="_blank"
      >
        <h2
          class="mb-6 text-center flex items-center justify-center text-[32px]"
        >
          Frequently asked questions
          <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
        </h2>
      </a>
    </div>
  </div>
</template>
