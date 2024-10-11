<script setup lang="ts">
import { clone, getSalt } from '@/helpers/utils';
import { enabledReadWriteNetworks, getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, SpaceMetadata, SpaceSettings } from '@/types';

const PAGES = [
  {
    id: 'profile',
    title: 'Profile'
  },
  {
    id: 'network',
    title: 'Network'
  },
  {
    id: 'strategies',
    title: 'Strategies'
  },
  {
    id: 'validations',
    title: 'Proposal validation'
  },
  {
    id: 'executions',
    title: 'Executions'
  },
  {
    id: 'auths',
    title: 'Auths'
  },
  {
    id: 'voting',
    title: 'Voting'
  },
  {
    id: 'controller',
    title: 'Controller'
  }
] as const;

type PageID = (typeof PAGES)[number]['id'];

const { setTitle } = useTitle();
const { predictSpaceAddress } = useActions();
const { web3 } = useWeb3();

const pagesRefs = ref([] as HTMLElement[]);
const sending = ref(false);
const currentPage: Ref<PageID> = ref('profile');
const pagesErrors: Ref<Record<PageID, Record<string, string>>> = ref({
  profile: {},
  network: {},
  strategies: {},
  auths: {},
  validations: {},
  executions: {},
  voting: {},
  controller: {}
});
const metadataForm: SpaceMetadata = reactive(
  clone({
    name: '',
    avatar: '',
    cover: '',
    description: '',
    externalUrl: '',
    twitter: '',
    github: '',
    discord: '',
    votingPowerSymbol: '',
    treasuries: [],
    delegations: []
  })
);
const selectedNetworkId: Ref<NetworkID> = ref(enabledReadWriteNetworks[0]);
const authenticators = ref([] as StrategyConfig[]);
const validationStrategy: Ref<StrategyConfig | null> = ref(null);
const votingStrategies = ref([] as StrategyConfig[]);
const executionStrategies = ref([] as StrategyConfig[]);
const settingsForm: SpaceSettings = reactive(
  clone({
    votingDelay: 0,
    minVotingDuration: 0,
    maxVotingDuration: 86400
  })
);
const controller = ref(web3.value.account);
const confirming = ref(false);
const salt: Ref<string | null> = ref(null);
const predictedSpaceAddress: Ref<string | null> = ref(null);

const selectedNetwork = computed(() => getNetwork(selectedNetworkId.value));
const accessiblePages = computed(() => {
  const invalidPageIndex = PAGES.findIndex(page => !validatePage(page.id));

  return Object.fromEntries(
    PAGES.map((page, i) => [
      page.id,
      invalidPageIndex === -1 ? true : i <= invalidPageIndex
    ])
  );
});
const showCreate = computed(
  () =>
    PAGES.findIndex(page => page.id === currentPage.value) === PAGES.length - 1
);
const nextDisabled = computed(() => !validatePage(currentPage.value));
const submitDisabled = computed(() =>
  PAGES.some(page => !validatePage(page.id))
);

function validatePage(page: PageID) {
  if (page === 'strategies') return votingStrategies.value.length > 0;
  if (page === 'auths') return authenticators.value.length > 0;
  if (page === 'validations') {
    if (!validationStrategy.value) return false;

    return validationStrategy.value.validate
      ? validationStrategy.value.validate(validationStrategy.value.params)
      : true;
  }

  return Object.values(pagesErrors.value[page]).length === 0;
}

function handleErrors(page: PageID, errors: any) {
  pagesErrors.value[page] = errors;
}

function handleNextClick() {
  const currentIndex = PAGES.findIndex(page => page.id === currentPage.value);
  if (currentIndex === PAGES.length - 1) return;

  currentPage.value = PAGES[currentIndex + 1].id;
  pagesRefs.value[currentIndex + 1].scrollIntoView();
}

async function handleSubmit() {
  salt.value = getSalt();
  predictedSpaceAddress.value = await predictSpaceAddress(
    selectedNetworkId.value,
    salt.value
  );
  confirming.value = true;
}

watch(
  () => web3.value.account,
  value => {
    if (!controller.value && value) {
      controller.value = value;
    }
  }
);

watch(selectedNetworkId, () => {
  authenticators.value = [];
  validationStrategy.value = null;
  votingStrategies.value = [];
  executionStrategies.value = [];
});

watchEffect(() => setTitle('Create space'));
</script>

<template>
  <div>
    <CreateDeploymentProgress
      v-if="confirming && salt && predictedSpaceAddress && validationStrategy"
      :network-id="selectedNetworkId"
      :salt="salt"
      :predicted-space-address="predictedSpaceAddress"
      :metadata="metadataForm"
      :settings="settingsForm"
      :authenticators="authenticators"
      :validation-strategy="validationStrategy"
      :voting-strategies="votingStrategies"
      :execution-strategies="executionStrategies"
      :controller="controller"
    />
    <div v-else class="pt-5 flex max-w-[50rem] mx-auto px-4">
      <div
        class="flex fixed lg:sticky top-[72px] inset-x-0 p-3 border-b z-10 bg-skin-bg lg:top-auto lg:inset-x-auto lg:p-0 lg:pr-5 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-auto"
      >
        <button
          v-for="page in PAGES"
          ref="pagesRefs"
          :key="page.id"
          type="button"
          :disabled="!accessiblePages[page.id]"
          class="px-3 py-1 block lg:w-full rounded text-left scroll-mr-3 first:ml-auto last:mr-auto whitespace-nowrap"
          :class="{
            'bg-skin-active-bg': page.id === currentPage,
            'hover:bg-skin-hover-bg': page.id !== currentPage,
            'text-skin-link': accessiblePages[page.id]
          }"
          @click="currentPage = page.id"
        >
          {{ page.title }}
        </button>
      </div>
      <div class="flex-1">
        <div class="mt-8 lg:mt-0">
          <template v-if="currentPage === 'profile'">
            <h3 class="mb-4">Space profile</h3>
            <FormSpaceProfile
              :form="metadataForm"
              @errors="v => handleErrors('profile', v)"
            />
            <div class="s-box p-4 -mt-6">
              <FormSpaceTreasuries
                v-model="metadataForm.treasuries"
                :network-id="selectedNetworkId"
              />
              <FormSpaceDelegations
                v-model="metadataForm.delegations"
                :network-id="selectedNetworkId"
                class="mt-2"
              />
            </div>
          </template>
          <FormNetwork
            v-else-if="currentPage === 'network'"
            v-model="selectedNetworkId"
          />
          <FormStrategies
            v-else-if="currentPage === 'strategies'"
            v-model="votingStrategies"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork.constants.EDITOR_VOTING_STRATEGIES
            "
            title="Voting strategies"
            description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
          />
          <FormStrategies
            v-else-if="currentPage === 'auths'"
            v-model="authenticators"
            unique
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork.constants.EDITOR_AUTHENTICATORS
            "
            title="Authenticators"
            description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
          />
          <FormValidation
            v-else-if="currentPage === 'validations'"
            v-model="validationStrategy"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork.constants.EDITOR_PROPOSAL_VALIDATIONS
            "
            :available-voting-strategies="
              selectedNetwork.constants
                .EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES
            "
            title="Proposal validation"
            description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
          />
          <FormStrategies
            v-else-if="currentPage === 'executions'"
            v-model="executionStrategies"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork.constants.EDITOR_EXECUTION_STRATEGIES
            "
            :default-params="{ controller }"
            title="Execution strategies"
            description="Execution strategies are used to determine the status of a proposal and execute its payload if it's accepted."
          />
          <FormVoting
            v-else-if="currentPage === 'voting'"
            :form="settingsForm"
            :selected-network-id="selectedNetworkId"
            @errors="v => handleErrors('voting', v)"
          />
          <FormController
            v-else-if="currentPage === 'controller'"
            v-model="controller"
            @errors="v => handleErrors('controller', v)"
          />
        </div>

        <UiButton
          v-if="showCreate"
          class="w-full"
          :loading="sending"
          :disabled="submitDisabled"
          @click="handleSubmit"
        >
          Create
        </UiButton>
        <UiButton
          v-else
          class="w-full"
          :disabled="nextDisabled"
          @click="handleNextClick"
        >
          Next
        </UiButton>
      </div>
    </div>
  </div>
</template>
