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

const { predictSpaceAddress } = useActions();
const { web3 } = useWeb3();

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
    terms: '',
    votingPowerSymbol: '',
    treasuries: [],
    labels: [],
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

function validatePage(page: string): boolean | undefined {
  if (page === 'strategies') return votingStrategies.value.length > 0;
  if (page === 'auths') return authenticators.value.length > 0;
  if (page === 'validations') {
    if (!validationStrategy.value) return false;

    return validationStrategy.value.validate
      ? validationStrategy.value.validate(validationStrategy.value.params)
      : true;
  }
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
      @back="confirming = false"
    />
    <UiStepper
      v-else
      :steps="PAGES"
      :validate-page-fn="validatePage"
      @submit="handleSubmit"
    >
      <template #content="{ currentPage, handleErrors }">
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
      </template>
      <template #submit-text> Create </template>
    </UiStepper>
  </div>
</template>
