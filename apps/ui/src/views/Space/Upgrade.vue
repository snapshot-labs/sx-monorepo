<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import { TOKENS } from '@/composables/usePayment';
import {
  CALENDLY_URL,
  DOCS_URL,
  PRO_MONTHLY_PRICES,
  SALES_TELEGRAM_URL,
  SNAPSHOT_PLUS_FEES
} from '@/helpers/constants';
import { _n, getUrl, prettyConcat } from '@/helpers/utils';
import { getNetwork, metadataNetwork, offchainNetworks } from '@/networks';
import { Connector, HubNetwork } from '@/networks/types';
import { usePlusMonthlyCostQuery } from '@/queries/plusMonthlyCost';
import {
  SUBSCRIPTION_UNAVAILABLE,
  useSubscriptionStatusQuery
} from '@/queries/subscription';
import { Space } from '@/types';
import ICTelegram from '~icons/c/telegram';
import ICFlag from '~icons/heroicons-outline/flag';
import ICGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IClightningBolt from '~icons/heroicons-outline/lightning-bolt';
import ICLink from '~icons/heroicons-outline/link';
import ICPuzzle from '~icons/heroicons-outline/puzzle';
import ICSparkles from '~icons/heroicons-outline/sparkles';
import ICStatusOnline from '~icons/heroicons-outline/status-online';
import ICSupport from '~icons/heroicons-outline/support';

type SubscriptionLength = 'monthly' | 'yearly';

const DATE_FORMAT = 'D MMM YYYY';
const ACCEPTED_TOKENS_SYMBOL: string[] = ['USDC', 'USDT', 'SNUSDC'];
const YEARLY_SAVING = Math.round(
  (1 - PRO_MONTHLY_PRICES.yearly / PRO_MONTHLY_PRICES.monthly) * 100
);

// Plus gets every Pro feature except the Explore highlight
const FEATURES = [
  {
    name: 'Any network',
    icon: ICGlobeAlt,
    about: 'Run your space and strategies on any network you need.'
  },
  {
    name: 'Advanced strategies',
    icon: ICPuzzle,
    about: 'Use delegation, overrides and other heavy strategies.'
  },
  {
    name: 'Featured in Explore',
    icon: ICStatusOnline,
    about: 'Rank higher in Explore and search, so more voters find you.',
    isProOnly: true
  },
  {
    name: 'Delegates dashboard',
    icon: IClightningBolt,
    about: 'All delegates, sorted by voting power, with profiles.'
  },
  {
    name: 'Custom domain',
    icon: ICLink,
    about: 'Run your space on your own domain, colors and logo.'
  },
  {
    name: 'Proposal monitoring',
    icon: ICFlag,
    about: 'Spam and malicious proposals reviewed within 2 hours.'
  },
  {
    name: 'Priority support',
    icon: ICSupport,
    about: 'A private Telegram group with answers within 4 hours.'
  },
  {
    name: 'Early access',
    icon: ICSparkles,
    about: 'Try new features and improvements before everyone else.'
  }
];

const LIMITS = [
  ['Proposals per day', 'proposal_limit_per_day'],
  ['Proposals per month', 'proposal_limit_per_month'],
  ['Proposal length', 'body_limit'],
  ['Choices', 'choices_limit'],
  ['Voting strategies', 'strategies_limit']
] as const;

const props = defineProps<{ space?: Space }>();

const router = useRouter();
const route = useRoute();
const { limits } = useSettings();
const { login, auth } = useWeb3();
const queryClient = useQueryClient();
const uiStore = useUiStore();
const { setTitle } = useTitle();
const { redirectToPortal, isLoading: isStripeLoading } = useStripeCheckout();

const referral = route.query.ref as string;

const subscriptionLength = ref<SubscriptionLength>('yearly');
const selectedSpace = ref<Space | null>(props.space || null);
// What to open once a space is picked
const intent = ref<'plus' | 'pro'>('pro');
const modalPaymentOpen = ref(false);
const modalCreditsOpen = ref(false);
const modalSpaceOpen = ref(false);
const modalConnectorOpen = ref(false);

const { data: subscriptionStatus, isError: isSubscriptionError } =
  useSubscriptionStatusQuery(
    toRef(() => selectedSpace.value?.id ?? ''),
    toRef(() => selectedSpace.value?.network ?? '')
  );
const subscription = computed(
  () =>
    subscriptionStatus.value ??
    (isSubscriptionError.value ? SUBSCRIPTION_UNAVAILABLE : null)
);

const currentPlan = computed(() => {
  if (selectedSpace.value?.plus) return 'plus';
  return selectedSpace.value?.turbo ? 'pro' : null;
});
const proEndDate = computed(() =>
  currentPlan.value === 'pro' && selectedSpace.value?.turbo_expiration
    ? dayjs(selectedSpace.value.turbo_expiration * 1e3).format(DATE_FORMAT)
    : ''
);
// What blocks this space from creating proposals today, as in the editor
const { alerts } = props.space
  ? useSpaceAlerts(toRef(props, 'space') as Ref<Space>, { isEditor: true })
  : { alerts: ref(new Map()) };
// Short plan status shown in the hero tag
const planDetail = computed(() => {
  if (currentPlan.value === 'plus') {
    return `${_n(selectedSpace.value?.credits, 'standard', { maximumFractionDigits: 4 })} ETH left`;
  }
  return proEndDate.value ? `Until ${proEndDate.value}` : '';
});

const unlock = computed(() => {
  const networks: HubNetwork[] =
    alerts.value.get('HAS_PRO_ONLY_NETWORKS')?.networks ?? [];
  const strategies: string[] =
    alerts.value.get('HAS_PRO_ONLY_STRATEGIES')?.strategies ?? [];
  if (!networks.length && !strategies.length) return null;

  const names = networks.map(({ name }) => name);
  if (strategies.length) {
    const kind = strategies.length > 1 ? 'strategies' : 'strategy';
    names.push(`the ${prettyConcat(strategies, 'and')} ${kind}`);
  }
  const isStrategiesOnly =
    !strategies.length &&
    networks.every(({ id }) => id !== props.space?.snapshot_chain_id);
  const pronoun = networks.length > 1 ? 'them' : 'it';

  return {
    networks,
    hasStrategies: strategies.length > 0,
    title: `Unlock ${prettyConcat(names, 'and')}`,
    about: isStrategiesOnly
      ? `Use ${pronoun} in your strategies and create proposals again, with either plan.`
      : 'Create proposals again, with either plan.'
  };
});

// Pro spaces get no recommendation, so we never suggest a downgrade
const { data: plusMonthlyCost } = usePlusMonthlyCostQuery(() =>
  currentPlan.value === 'pro' ? undefined : props.space
);
// Compared with the Pro price for the selected billing period
const recommendedPlan = computed(() => {
  if (plusMonthlyCost.value === undefined) return null;
  return plusMonthlyCost.value > PRO_MONTHLY_PRICES[subscriptionLength.value]
    ? 'pro'
    : 'plus';
});
// The primary button follows the current plan, then the recommendation
const primaryPlan = computed(
  () => currentPlan.value ?? recommendedPlan.value ?? 'pro'
);
const recommendationReason = computed(() => {
  const plusCost = _n(plusMonthlyCost.value ?? 0, 'standard', {
    maximumFractionDigits: 0
  });
  return `Plus ~$${plusCost}/mo vs Pro $${PRO_MONTHLY_PRICES[subscriptionLength.value]}/mo at your usage`;
});

const paymentNetwork = computed(() =>
  metadataNetwork === 's' ? '1' : '11155111'
);
const spaceKey = computed(() =>
  selectedSpace.value
    ? `${selectedSpace.value.network}:${selectedSpace.value.id}`
    : ''
);
const tokens = computed(() =>
  TOKENS[paymentNetwork.value].filter(t =>
    ACCEPTED_TOKENS_SYMBOL.includes(t.symbol)
  )
);
const supportedConnectors = computed(
  () => getNetwork(metadataNetwork).managerConnectors
);
const isCurrentConnectorSupported = computed(
  () =>
    !!auth.value &&
    supportedConnectors.value.includes(auth.value.connector.type)
);
const nextRenewalDate = computed(() =>
  dayjs()
    .add(1, subscriptionLength.value === 'yearly' ? 'year' : 'month')
    .format(DATE_FORMAT)
);

function calculator(amount: number, quantity: number): number {
  if (subscriptionLength.value === 'yearly') {
    return Number((amount * quantity).toFixed(2));
  }

  return Number(
    (
      quantity *
      (quantity >= 12 ? PRO_MONTHLY_PRICES.yearly : PRO_MONTHLY_PRICES.monthly)
    ).toFixed(2)
  );
}

function choose(plan: 'plus' | 'pro') {
  intent.value = plan;
  if (!selectedSpace.value) modalSpaceOpen.value = true;
  else if (plan === 'plus') modalCreditsOpen.value = true;
  else modalPaymentOpen.value = true;
}

function handlePickSpace(space: Space) {
  selectedSpace.value = space;
  modalSpaceOpen.value = false;
  choose(intent.value);
}

async function handleConnectorPick(connector: Connector) {
  modalConnectorOpen.value = false;
  await login(connector);
  if (auth.value) modalPaymentOpen.value = true;
}

async function handlePaymentConfirmed() {
  if (!spaceKey.value) return;

  await queryClient.invalidateQueries({
    queryKey: ['spaces', 'detail', spaceKey.value]
  });
}

function handleModalPaymentClose() {
  modalPaymentOpen.value = false;
  selectedSpace.value = props.space || null;
}

async function handleStripeSuccess() {
  uiStore.addNotification(
    'success',
    'Payment received! Your Pro subscription will be active shortly.'
  );

  const stripeSpaceKey = route.query.space as string | undefined;
  const query = { ...route.query };
  delete query.stripe_success;
  delete query.space;
  router.replace({ query });

  if (stripeSpaceKey) {
    await queryClient.invalidateQueries({
      queryKey: ['spaces', 'detail', stripeSpaceKey]
    });
  }
}

watchEffect(() =>
  setTitle(
    selectedSpace.value ? `Upgrade - ${selectedSpace.value.name}` : 'Upgrade'
  )
);

onMounted(() => {
  if (route.query.stripe_success) {
    handleStripeSuccess().catch(err =>
      console.error('[stripe] post-checkout refresh failed', err)
    );
  }

  if (
    !selectedSpace.value ||
    offchainNetworks.includes(selectedSpace.value.network)
  ) {
    return;
  }

  router.push({
    name: 'space-overview',
    params: {
      network: selectedSpace.value.network,
      id: selectedSpace.value.id
    }
  });
});
</script>

<template>
  <div class="space-y-10 pb-8">
    <div>
      <!-- Same cover and avatar overlap as the space page hero -->
      <div
        v-if="selectedSpace"
        class="h-[156px] md:h-[140px] mb-[-49px] overflow-hidden"
      >
        <SpaceCover :space="selectedSpace" />
      </div>
      <div
        class="px-4 flex flex-col items-center text-center gap-2.5"
        :class="{
          'pt-8 bg-gradient-to-b from-skin-border to-skin-border/0':
            !selectedSpace
        }"
      >
        <SpaceAvatar
          v-if="selectedSpace"
          :space="selectedSpace"
          :size="90"
          class="relative border-4 border-skin-bg !rounded-lg"
        />
        <h1 class="text-balance">
          Upgrade {{ selectedSpace?.name ?? 'your space' }}
        </h1>
        <p class="text-lg text-balance">
          Premium features and higher limits.<br />
          Pay as you go, or subscribe.
        </p>
        <div
          v-if="planDetail"
          class="flex items-center gap-1.5 border rounded-full px-3 py-1 text-base"
        >
          <UiBadgeSpace
            turbo
            :plus="currentPlan === 'plus'"
            :verified="false"
            :flagged="false"
          />
          <span class="text-skin-link">
            {{ currentPlan === 'plus' ? 'Plus' : 'Pro' }}
          </span>
          · {{ planDetail }}
        </div>
      </div>
    </div>

    <div class="mx-4 space-y-5">
      <!-- Subgrid rows keep both cards' price, text and button aligned -->
      <div class="grid md:grid-cols-2 gap-3 mx-auto max-w-[740px]">
        <div
          class="relative border rounded-xl p-4 grid grid-rows-subgrid row-span-4 gap-3"
          :class="{ 'border-skin-link': currentPlan === 'plus' }"
        >
          <div
            v-if="currentPlan === 'plus' || recommendedPlan === 'plus'"
            class="absolute -top-[11px] inset-x-0 flex justify-center"
          >
            <UiPill
              v-if="currentPlan === 'plus'"
              label="Current plan"
              class="!text-sm !leading-[22px] !px-2"
            />
            <UiTooltip v-else :title="recommendationReason">
              <UiPill
                variant="primary"
                label="Recommended"
                class="!text-sm !leading-[22px] !px-2"
              />
            </UiTooltip>
          </div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <UiBadgeSpace turbo plus :verified="false" :flagged="false" />
            <h3>Plus</h3>
            <span class="ml-auto text-sm whitespace-nowrap">Pay per use</span>
          </div>
          <div>
            <h2>
              {{ SNAPSHOT_PLUS_FEES.proposal }} ETH
              <span class="text-base text-skin-text">/ proposal</span>
            </h2>
            <div>+ {{ SNAPSHOT_PLUS_FEES.vote }} ETH / vote</div>
          </div>
          <div class="leading-snug">
            No commitment. Pay in ETH on Ethereum or Base.
          </div>
          <UiButton
            :primary="primaryPlan === 'plus'"
            class="w-full"
            @click="choose('plus')"
          >
            Add credits
          </UiButton>
        </div>
        <div
          class="relative border rounded-xl p-4 grid grid-rows-subgrid row-span-4 gap-3"
          :class="{ 'border-skin-link': currentPlan === 'pro' }"
        >
          <div
            v-if="currentPlan === 'pro' || recommendedPlan === 'pro'"
            class="absolute -top-[11px] inset-x-0 flex justify-center"
          >
            <UiPill
              v-if="currentPlan === 'pro'"
              label="Current plan"
              class="!text-sm !leading-[22px] !px-2"
            />
            <UiTooltip v-else :title="recommendationReason">
              <UiPill
                variant="primary"
                label="Recommended"
                class="!text-sm !leading-[22px] !px-2"
              />
            </UiTooltip>
          </div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <UiBadgeSpace turbo :verified="false" :flagged="false" />
            <h3>Pro</h3>
            <span class="ml-auto text-sm whitespace-nowrap">Subscription</span>
          </div>
          <div>
            <h2>
              ${{ PRO_MONTHLY_PRICES[subscriptionLength] }}
              <span class="text-base text-skin-text">/ month</span>
            </h2>
            <div>
              {{
                subscriptionLength === 'yearly'
                  ? `Billed $${_n(PRO_MONTHLY_PRICES.yearly * 12)} yearly`
                  : 'Billed monthly'
              }}
            </div>
            <div class="flex gap-1 rounded-full border p-1 text-sm mt-2">
              <button
                v-for="length in ['monthly', 'yearly'] as SubscriptionLength[]"
                :key="length"
                type="button"
                class="flex-1 rounded-full px-3 py-1 capitalize whitespace-nowrap"
                :class="
                  subscriptionLength === length
                    ? 'bg-skin-border text-skin-heading'
                    : 'text-skin-text'
                "
                :aria-pressed="subscriptionLength === length"
                @click="subscriptionLength = length"
              >
                {{ length }}
                <span v-if="length === 'yearly'" class="text-skin-link">
                  −{{ YEARLY_SAVING }}%
                </span>
              </button>
            </div>
          </div>
          <div class="leading-snug">
            Fixed price, featured in Explore. Pay by card, USDC or USDT.
          </div>
          <UiButton
            v-if="subscription?.hasActiveSubscription"
            :primary="primaryPlan === 'pro'"
            class="w-full"
            :loading="isStripeLoading"
            @click="redirectToPortal(spaceKey.split(':')[0])"
          >
            Manage subscription
          </UiButton>
          <UiButton
            v-else
            :primary="primaryPlan === 'pro'"
            class="w-full"
            :loading="!!selectedSpace && !subscription"
            :disabled="
              !!selectedSpace && selectedSpace.network !== metadataNetwork
            "
            @click="choose('pro')"
          >
            {{ currentPlan === 'pro' ? 'Extend Pro' : 'Upgrade to Pro' }}
          </UiButton>
        </div>
      </div>
      <div class="flex justify-center">
        <UiDropdown placement="start">
          <template #button>
            <UiButton>
              Talk to sales
              <IH-chevron-down />
            </UiButton>
          </template>
          <template #items>
            <UiDropdownItem :to="CALENDLY_URL">
              <IH-calendar />
              Book a call
            </UiDropdownItem>
            <UiDropdownItem :to="SALES_TELEGRAM_URL">
              <ICTelegram />
              Message us
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
      <div
        v-if="unlock"
        class="mx-auto max-w-[740px] flex flex-col items-center text-center gap-3 px-4 pt-4 pb-2"
      >
        <div class="flex shrink-0">
          <img
            v-for="network in unlock.networks"
            :key="network.id"
            :src="getUrl(network.logo) ?? undefined"
            :alt="network.name"
            :title="network.name"
            class="size-[48px] rounded-full border-[3px] border-skin-bg bg-skin-border -ml-3 first:ml-0"
          />
          <div
            v-if="unlock.hasStrategies"
            class="size-[48px] rounded-full border-[3px] border-skin-bg bg-skin-border -ml-3 first:ml-0 flex items-center justify-center text-skin-link"
          >
            <IH-puzzle class="size-[28px]" />
          </div>
        </div>
        <div>
          <h3 class="text-balance" v-text="unlock.title" />
          <div class="text-lg leading-snug" v-text="unlock.about" />
        </div>
      </div>
    </div>

    <div class="mx-4 space-y-5">
      <h2 class="text-center">Features</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto max-w-[740px]">
        <div
          v-for="feature in FEATURES"
          :key="feature.name"
          class="bg-skin-border/10 border rounded-lg p-3 pb-4"
        >
          <div class="flex items-center justify-between mb-3">
            <component :is="feature.icon" class="text-skin-link size-[24px]" />
            <span
              v-if="feature.isProOnly"
              class="text-sm border rounded-full px-2"
            >
              Pro only
            </span>
          </div>
          <h4 class="text-skin-link text-[21px] mb-1" v-text="feature.name" />
          <div v-text="feature.about" />
        </div>
      </div>
    </div>

    <div class="mx-4 space-y-5">
      <h2 class="text-center">Limits</h2>
      <div class="border rounded-lg mx-auto max-w-[640px] divide-y">
        <div class="flex px-3 sm:px-4 py-2">
          <div class="flex-1" />
          <UiEyebrow class="w-[72px] sm:w-[120px] text-center">Basic</UiEyebrow>
          <UiEyebrow class="w-[72px] sm:w-[120px] text-center"
            >Plus & Pro</UiEyebrow
          >
        </div>
        <div
          v-for="[title, key] in LIMITS"
          :key="key"
          class="flex px-3 sm:px-4 py-2.5 text-skin-heading"
        >
          <div class="flex-1" v-text="title" />
          <div
            class="w-[72px] sm:w-[120px] text-center"
            v-text="_n(limits[`space.default.${key}`])"
          />
          <div
            class="w-[72px] sm:w-[120px] text-center"
            v-text="_n(limits[`space.turbo.${key}`])"
          />
        </div>
      </div>
    </div>

    <div class="text-center">
      <AppLink :to="`${DOCS_URL}/user-guides/spaces/upgrade`">
        Frequently asked questions
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </AppLink>
    </div>

    <ModalPayment
      v-if="selectedSpace && modalPaymentOpen"
      :plan="subscriptionLength"
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
        params: { space: spaceKey },
        ref: referral || undefined
      }"
      :space="spaceKey"
      :hide-card="subscription?.isStripeAvailable === false"
      :is-card-loading="!subscription"
      :is-auth-valid-for-crypto="isCurrentConnectorSupported"
      @connect-wallet="modalConnectorOpen = true"
      @close="handleModalPaymentClose"
      @confirmed="handlePaymentConfirmed"
    >
      <template #summary="{ quantity, paymentMethod }">
        <div class="flex justify-between">
          <template v-if="paymentMethod === 'card'">
            <div>Auto-renews</div>
            <div class="text-skin-heading">
              {{ nextRenewalDate }}
              <span class="capitalize">({{ subscriptionLength }})</span>
            </div>
          </template>
          <template v-else>
            <div>End date</div>
            <div class="text-skin-heading">
              {{
                dayjs(
                  (selectedSpace.turbo_expiration || 0) * 1e3 > Date.now()
                    ? selectedSpace.turbo_expiration * 1e3
                    : new Date()
                )
                  .add(
                    quantity,
                    subscriptionLength === 'yearly' ? 'year' : 'month'
                  )
                  .format(DATE_FORMAT)
              }}
              ({{ quantity }}
              {{ subscriptionLength === 'yearly' ? 'year' : 'month'
              }}{{ quantity > 1 ? 's' : '' }})
            </div>
          </template>
        </div>
      </template>
      <template #transactionModalSuccessTitle>
        <h4
          class="font-semibold text-skin-heading text-lg flex flex-col items-center gap-2 mb-3"
        >
          Upgraded to
          <div class="inline-block text-skin-bg bg-skin-link rounded-full px-2">
            <UiEyebrow class="text-skin-bg">Snapshot Pro</UiEyebrow>
          </div>
        </h4>
      </template>
      <template #transactionModalSuccessSubtitle>
        Thank you for your subscription!
      </template>
    </ModalPayment>
    <teleport to="#modal">
      <!-- Stays mounted after closing, it tracks the deposit transaction -->
      <ModalAddCredits
        v-if="selectedSpace"
        :open="modalCreditsOpen"
        :space="selectedSpace"
        @close="modalCreditsOpen = false"
      />
    </teleport>
    <ModalSpace
      :open="modalSpaceOpen"
      @close="modalSpaceOpen = false"
      @pick="handlePickSpace"
    />
    <ModalConnector
      :open="modalConnectorOpen"
      :supported-connectors="supportedConnectors"
      @pick="handleConnectorPick"
      @close="modalConnectorOpen = false"
    />
  </div>
</template>
