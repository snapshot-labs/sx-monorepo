<script setup lang="ts">
import { StepRecords } from '@/components/Ui/Stepper.vue';
import { clone, getSalt } from '@/helpers/utils';
import { enabledReadWriteNetworks, getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, SpaceMetadata, SpaceSettings } from '@/types';

const STEPS: StepRecords = {
  profile: {
    title: 'Profile',
    isValid: () => !stepsErrors.value['profile']
  },
  network: {
    title: 'Network',
    isValid: () => true
  },
  strategies: {
    title: 'Strategies',
    isValid: () => votingStrategies.value.length > 0
  },
  validations: {
    title: 'Proposal validation',
    isValid: () => {
      if (!validationStrategy.value) return false;

      return validationStrategy.value.validate
        ? validationStrategy.value.validate(validationStrategy.value.params)
        : true;
    }
  },
  executions: {
    title: 'Executions',
    isValid: () => true
  },
  auths: {
    title: 'Auths',
    isValid: () => authenticators.value.length > 0
  },
  voting: {
    title: 'Voting',
    isValid: () => !stepsErrors.value['voting']
  },
  controller: {
    title: 'Controller',
    isValid: () => !stepsErrors.value['controller']
  }
} as const;

const { predictSpaceAddress } = useActions();
const { web3 } = useWeb3();
useTitle('Create space');

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
const stepsErrors = ref<Record<string, boolean>>({
  profile: false,
  voting: false,
  controller: false
});

const selectedNetwork = computed(() => getNetwork(selectedNetworkId.value));

async function handleSubmit() {
  salt.value = getSalt();
  predictedSpaceAddress.value = await predictSpaceAddress(
    selectedNetworkId.value,
    salt.value
  );
  confirming.value = true;
}

function handleErrors(stepName: string, errors: any) {
  stepsErrors.value[stepName] = Object.values(errors).length > 0;
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
    class="lg:max-w-[50rem] max-w-[592px] mx-auto px-4 lg:pt-5 gap-x-5"
    :steps="STEPS"
    @submit="handleSubmit"
  >
    <template #content="{ currentStep }">
      <template v-if="currentStep === 'profile'">
        <FormSpaceProfile
          :form="metadataForm"
          @errors="v => handleErrors('profile', v)"
        />
        <div class="px-4 pt-4">
          <FormSpaceTreasuries
            v-model="metadataForm.treasuries"
            :network-id="selectedNetworkId"
          />
          <FormSpaceDelegations
            v-model="metadataForm.delegations"
            :network-id="selectedNetworkId"
            class="mt-4"
          />
        </div>
      </template>
      <FormNetwork
        v-else-if="currentStep === 'network'"
        v-model="selectedNetworkId"
        title="Space network"
      />
      <FormStrategies
        v-else-if="currentStep === 'strategies'"
        v-model="votingStrategies"
        :network-id="selectedNetworkId"
        :available-strategies="
          selectedNetwork.constants.EDITOR_VOTING_STRATEGIES
        "
        title="Voting strategies"
        description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
      />
      <FormStrategies
        v-else-if="currentStep === 'auths'"
        v-model="authenticators"
        unique
        :network-id="selectedNetworkId"
        :available-strategies="selectedNetwork.constants.EDITOR_AUTHENTICATORS"
        title="Authenticators"
        description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
      />
      <FormValidation
        v-else-if="currentStep === 'validations'"
        v-model="validationStrategy"
        :network-id="selectedNetworkId"
        :available-strategies="
          selectedNetwork.constants.EDITOR_PROPOSAL_VALIDATIONS
        "
        :available-voting-strategies="
          selectedNetwork.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES
        "
        title="Proposal validation"
        description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
      />
      <FormStrategies
        v-else-if="currentStep === 'executions'"
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
        v-else-if="currentStep === 'voting'"
        :form="settingsForm"
        :selected-network-id="selectedNetworkId"
        title="Voting settings"
        @errors="v => handleErrors('voting', v)"
      />
      <FormController
        v-else-if="currentStep === 'controller'"
        v-model="controller"
        class="s-input-pb-0"
        title="Controller"
        :chain-id="selectedNetwork.chainId"
        @errors="v => handleErrors('controller', v)"
      />
    </template>
    <template #submit-text> Create </template>
  </UiStepper>
</template>
