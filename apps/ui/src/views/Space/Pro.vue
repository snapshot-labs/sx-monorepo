<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import { TOKENS } from '@/composables/usePayment';
import { _n } from '@/helpers/utils';
import { getNetwork, metadataNetwork, offchainNetworks } from '@/networks';
import { Connector } from '@/networks/types';
import { Space } from '@/types';
import ICAnnotation from '~icons/heroicons-outline/annotation';
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

const ACCEPTED_TOKENS_SYMBOL: string[] = ['USDC', 'USDT', 'SNUSDC'] as const;

const PRO_MONTHLY_PRICES: Record<SubscriptionLength, number> = {
  monthly: 600,
  yearly: 500
} as const;

const FEATURES = [
  {
    name: 'Enhanced visibility',
    icon: ICStatusOnline,
    about: "Increase your space's ranking to reach a larger audience."
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

const props = defineProps<{ space: Space }>();

const router = useRouter();
const route = useRoute();
const { limits } = useSettings();
const { login, auth } = useWeb3();
const queryClient = useQueryClient();

const referral: string = route.query.ref as string;

const subscriptionLength = ref<SubscriptionLength>('yearly');
const modalPaymentOpen = ref(false);
const modalConnectorOpen = ref(false);

const paymentNetwork = computed(() => (metadataNetwork === 's' ? 1 : 11155111));

const tokens = computed(() => {
  return TOKENS[paymentNetwork.value].filter(t =>
    ACCEPTED_TOKENS_SYMBOL.includes(t.symbol)
  );
});

const supportedConnectors = computed(() => {
  return getNetwork(metadataNetwork).managerConnectors;
});

const isCurrentConnectorSupported = computed(() => {
  return (
    auth.value && supportedConnectors.value.includes(auth.value.connector.type)
  );
});

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

function calculator(amount: number, quantity: number): number {
  if (subscriptionLength.value === 'yearly')
    return Number((amount * quantity).toFixed(2));

  return Number(
    (
      quantity *
      (quantity >= 12 ? PRO_MONTHLY_PRICES.yearly : PRO_MONTHLY_PRICES.monthly)
    ).toFixed(2)
  );
}

async function handleConnectorPick(connector: Connector) {
  modalConnectorOpen.value = false;
  await login(connector);
  if (auth.value) {
    modalPaymentOpen.value = true;
  }
}
async function handleTurboClick() {
  if (!auth.value || !isCurrentConnectorSupported.value) {
    modalConnectorOpen.value = true;
    return;
  }

  modalPaymentOpen.value = true;
}

async function handlePaymentConfirmed() {
  await queryClient.invalidateQueries({
    queryKey: ['spaces', 'detail', `${props.space.network}:${props.space.id}`]
  });
}

onMounted(() => {
  if (offchainNetworks.includes(props.space.network)) return;

  router.push({
    name: 'space-overview',
    params: {
      network: props.space.network,
      id: props.space.id
    }
  });
});
</script>

<template>
  <div class="space-y-10">
    <div class="shapes px-4 py-8 bg-skin-border/40 flex items-center">
      <div class="text-center w-full space-y-4">
        <span
          class="eyebrow inline-block text-skin-bg bg-skin-link rounded-full px-2"
          >Snapshot Pro</span
        >
        <h1 class="pb-4">
          Level up your governance<br />
          with exclusive features
        </h1>
      </div>
    </div>

    <div class="mx-4 space-y-4 flex flex-col items-center">
      <div class="max-w-[480px] w-full space-y-3">
        <button
          v-for="plan in Object.keys(PRO_MONTHLY_PRICES)"
          :key="plan"
          :class="[
            'border rounded-lg px-4 py-3 flex gap-2 justify-between w-full',
            { 'border-skin-link': subscriptionLength === plan }
          ]"
          @click="subscriptionLength = plan as SubscriptionLength"
        >
          <div class="flex flex-1 items-center gap-x-2 flex-wrap">
            <h3 class="text-start">Pay {{ plan }}</h3>
            <div v-if="plan === 'yearly'">
              <div class="bg-skin-border text-sm rounded-full px-2">
                Save ${{
                  _n(
                    (
                      (PRO_MONTHLY_PRICES.monthly - PRO_MONTHLY_PRICES.yearly) *
                      12
                    ).toFixed(0)
                  )
                }}
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end space-x-1 flex-wrap">
            <h2>${{ PRO_MONTHLY_PRICES[plan] }}</h2>
            <span class="text-sm text-skin-text">/ month</span>
          </div>
        </button>
      </div>
      <UiButton
        class="primary"
        :disabled="space.network !== metadataNetwork"
        @click="handleTurboClick"
      >
        {{ space.turbo ? 'Extend' : 'Upgrade' }} {{ space.name }}
      </UiButton>
    </div>

    <div class="space-y-4 mx-4 flex flex-col items-center">
      <h4 class="eyebrow">Trusted by leaders</h4>
      <div class="max-w-[740px] flex flex-wrap justify-center gap-3">
        <UiStamp
          v-for="(user, i) in USERS"
          :id="`s:${user}`"
          :key="i"
          :size="48"
          class="!bg-skin-bg rounded-lg"
          type="space"
        />
      </div>
    </div>

    <div class="mx-4">
      <h4 class="eyebrow mb-4 text-center">Features</h4>
      <h2 class="mb-6 text-center text-[32px]">
        Everything you asked for, and more
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto max-w-[740px]">
        <div
          v-for="(feature, i) in FEATURES"
          :key="i"
          class="bg-skin-border/20 border rounded-lg p-3 pb-4"
        >
          <component
            :is="feature.icon"
            class="text-skin-link inline-block size-[24px] mb-3"
          />
          <h4 class="text-skin-link text-[21px] mb-1" v-text="feature.name" />
          <div v-text="feature.about" />
        </div>
      </div>
    </div>

    <div class="mx-4">
      <h4 class="eyebrow mb-4 text-center">Limits</h4>
      <h2 class="mb-6 text-center text-[32px]">
        Take your governance to the max
      </h2>
      <div class="border rounded-lg mx-auto max-w-[640px]">
        <div
          class="flex rounded-t-lg border-b bg-skin-bg px-4 py-2 text-skin-heading uppercase font-semibold text-sm"
        >
          <div class="flex-1 min-w-[70px]" />
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
            <div class="flex-1 min-w-[70px]" v-text="feature.title" />
            <div
              v-for="type in TIER_PLAN"
              :key="type"
              class="w-[120px] text-center"
              v-text="_n(feature[type])"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="text-center shapes py-10 bg-skin-border/40 px-4 space-y-4">
      <h2 class="text-[32px]">Get started today</h2>
      <UiButton
        class="primary"
        :disabled="space.network !== metadataNetwork"
        @click="handleTurboClick"
      >
        {{ space.turbo ? 'Extend' : 'Upgrade' }} {{ space.name }}
      </UiButton>
    </div>

    <div class="px-4">
      <AppLink
        to="https://help.snapshot.box/en/collections/12372196-snapshot-pro"
      >
        <h2
          class="mb-6 text-center flex items-center justify-center text-[32px]"
        >
          Frequently asked questions
          <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
        </h2>
      </AppLink>
    </div>

    <ModalPayment
      v-if="auth && isCurrentConnectorSupported && modalPaymentOpen"
      :open="modalPaymentOpen"
      :tokens="tokens"
      :calculator="calculator"
      :network="paymentNetwork"
      :quantity-label="subscriptionLength === 'yearly' ? 'Years' : 'Months'"
      :unit-price="
        PRO_MONTHLY_PRICES[subscriptionLength] *
        (subscriptionLength === 'yearly' ? 12 : 1)
      "
      :barcode-payload="{
        type: 'turbo',
        ref: referral || undefined,
        params: {
          space: `${space.network}:${space.id}`
        }
      }"
      @close="modalPaymentOpen = false"
      @confirmed="handlePaymentConfirmed"
    >
      <template #summary="{ quantity }">
        <div class="flex justify-between">
          <div>End date</div>
          <div class="text-skin-heading">
            {{
              dayjs(
                space.turbo_expiration
                  ? space.turbo_expiration * 1e3
                  : new Date()
              )
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
      <template #transactionModalSuccessTitle>
        <h4
          class="font-semibold text-skin-heading text-lg flex flex-col items-center gap-2 mb-3"
        >
          Upgraded to
          <span
            class="eyebrow inline-block text-skin-bg bg-skin-link rounded-full px-2"
            >Snapshot Pro</span
          >
        </h4>
      </template>
      <template #transactionModalSuccessSubtitle>
        Thank you for your subscription!
      </template>
    </ModalPayment>
    <ModalConnector
      :open="modalConnectorOpen"
      :supported-connectors="supportedConnectors"
      @pick="handleConnectorPick"
      @close="modalConnectorOpen = false"
    />
  </div>
</template>
