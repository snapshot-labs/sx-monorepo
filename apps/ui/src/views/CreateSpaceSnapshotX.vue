<script setup lang="ts">
import { ContractFactory } from '@ethersproject/contracts';
import { StepRecords } from '@/components/Ui/Stepper.vue';
import { clone } from '@/helpers/utils';
import { getNetwork } from '@/networks';
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

const { web3, auth } = useWeb3();
useTitle('Create space');

const metadataForm: SpaceMetadata = reactive(
  clone({
    name: 'Inco',
    avatar:
      'https://pbs.twimg.com/profile_images/1909850439786659841/nfws7K_i_400x400.jpg',
    cover:
      'https://pbs.twimg.com/profile_banners/1698445642714976256/1747736922/1500x500',
    description: 'Confidential DAO',
    externalUrl: '',
    twitter: '',
    github: '',
    discord: '',
    farcaster: '',
    terms: '',
    votingPowerSymbol: '',
    treasuries: [],
    labels: [],
    delegations: []
  })
);

const selectedNetworkId: Ref<NetworkID> = ref('base-sep');
const selectedNetwork = computed(() => {
  const network = getNetwork(selectedNetworkId.value);
  if (!network) return null;
  return network;
});

// Initialize network-dependent values
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
const salt = ref(null);
const predictedSpaceAddress = ref(null);
const stepsErrors = ref<Record<string, boolean>>({
  profile: false,
  voting: false,
  controller: false
});

const isInitializing = ref(false);
const deployedAddresses = ref<{
  spaceContract: string;
  vanillaAuthenticator: string;
  vanillaProposalValidationStrategy: string;
  vanillaVotingStrategy: string;
  vanillaExecutionStrategy: string;
} | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const SPACE_CONTRACT = {
  abi: [],
  bytecode: '0x'
};

const VANILLA_AUTHENTICATOR = {
  abi: [],
  bytecode: '0x'
};

const VANILLA_PROPOSAL_VALIDATION_STRATEGY = {
  abi: [],
  bytecode: '0x'
};

const VANILLA_VOTING_STRATEGY = {
  abi: [],
  bytecode: '0x'
};

const VANILLA_EXECUTION_STRATEGY = {
  abi: [],
  bytecode: '0x'
};

const deployContract = async ({
  abi,
  bytecode,
  args = []
}: {
  abi: any;
  bytecode: string;
  args?: any[];
}) => {
  if (!auth.value?.provider) throw new Error('No provider available');

  const signer = auth.value.provider.getSigner();
  const factory = new ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract.address;
};

const storeDeployedAddresses = (addresses: any) => {
  const profileData = metadataForm;
  const newDeployment = {
    protocol: 'snapshot_x',
    network: 'base-sepolia',
    name: profileData.name,
    cover: profileData.cover,
    avatar: profileData.avatar,
    description: profileData.description,
    icon: profileData.avatar,
    createdAt: new Date().toISOString(),
    creatorAddress: controller.value,
    spaceContractAddress: addresses.spaceContract,
    proposalValidationStrategyAddress:
      addresses.vanillaProposalValidationStrategy,
    votingStrategyAddress: addresses.vanillaVotingStrategy,
    authenticatorAddress: addresses.vanillaAuthenticator,
    executionStrategyAddress: addresses.vanillaExecutionStrategy
  };
  const deployments = JSON.parse(
    localStorage.getItem('deployedContracts') || '[]'
  );
  deployments.push(newDeployment);
  localStorage.setItem(
    'deployedContracts',
    JSON.stringify(deployments, null, 2)
  );
};

const initialize = async (contractAddress: any) => {
  isInitializing.value = true;
  try {
    console.log(
      'Vanilla Validation Strategy',
      contractAddress?.vanillaProposalValidationStrategy
    );
    const data0 = {
      addr: contractAddress?.vanillaProposalValidationStrategy,
      params: '0x'
    };
    console.log(
      'Vanilla Voting Strategy',
      contractAddress?.vanillaVotingStrategy
    );
    const data1 = {
      addr: contractAddress?.vanillaVotingStrategy,
      params: '0x'
    };
    const votingData = settingsForm;
    const profileData = metadataForm;
    const votingDelaySeconds = votingData.votingDelay;
    const minVotingDurationSeconds = votingData.minVotingDuration;
    const maxVotingDurationSeconds = votingData.maxVotingDuration;
    const initData = {
      owner: controller.value,
      votingDelay: votingDelaySeconds,
      minVotingDuration: minVotingDurationSeconds,
      maxVotingDuration: maxVotingDurationSeconds,
      proposalValidationStrategy: data0,
      proposalValidationStrategyMetadataURI:
        profileData.externalUrl || 'https://example.com/metadata',
      daoURI: profileData.externalUrl || 'https://example.com/dao',
      metadataURI: `https://example.com/metadata/${profileData.name}`,
      votingStrategies: [data1],
      votingStrategyMetadataURIs: ['https://example.com/votingStrategy'],
      authenticators: [contractAddress?.vanillaAuthenticator]
    };

    if (!auth.value?.provider) throw new Error('No provider available');

    console.log('Initialization data:', initData);
  } catch (err) {
    console.error('Initialization failed:', err);
    error.value =
      err instanceof Error ? err.message : 'An unknown error occurred';
  } finally {
    isInitializing.value = false;
  }
};

const handleSubmit = async () => {
  isLoading.value = true;
  error.value = null;
  deployedAddresses.value = null;

  try {
    // Deploy contracts
    const spaceContract = await deployContract({
      abi: SPACE_CONTRACT.abi,
      bytecode: SPACE_CONTRACT.bytecode
    });
    const vanillaAuthenticator = await deployContract({
      abi: VANILLA_AUTHENTICATOR.abi,
      bytecode: VANILLA_AUTHENTICATOR.bytecode
    });
    const vanillaProposalValidationStrategy = await deployContract({
      abi: VANILLA_PROPOSAL_VALIDATION_STRATEGY.abi,
      bytecode: VANILLA_PROPOSAL_VALIDATION_STRATEGY.bytecode
    });
    const vanillaVotingStrategy = await deployContract({
      abi: VANILLA_VOTING_STRATEGY.abi,
      bytecode: VANILLA_VOTING_STRATEGY.bytecode
    });
    const vanillaExecutionStrategy = await deployContract({
      abi: VANILLA_EXECUTION_STRATEGY.abi,
      bytecode: VANILLA_EXECUTION_STRATEGY.bytecode,
      args: [controller.value, 1]
    });

    deployedAddresses.value = {
      spaceContract,
      vanillaAuthenticator,
      vanillaProposalValidationStrategy,
      vanillaVotingStrategy,
      vanillaExecutionStrategy
    };

    storeDeployedAddresses(deployedAddresses.value);
    isLoading.value = false;

    // Now initialize
    await initialize(deployedAddresses.value);
    confirming.value = true;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Deployment failed:', err);
    isLoading.value = false;
  }
};

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
  <div class="pt-5 max-w-[50rem] mx-auto px-4">
    <div
      v-if="isLoading || isInitializing"
      class="flex flex-col gap-2 items-center justify-center py-8"
    >
      <div class="flex items-center gap-2">
        <UiLoading v-if="isLoading" class="mr-2" />
        <span>Deploying contracts...</span>
      </div>
      <div class="flex items-center gap-2">
        <UiLoading v-if="isInitializing" class="mr-2" />
        <span>Initializing space...</span>
      </div>
    </div>
    <div v-else>
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
      <UiStepper v-else :steps="STEPS" @submit="handleSubmit">
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
              selectedNetwork?.constants.EDITOR_VOTING_STRATEGIES || []
            "
            title="Voting strategies"
            description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
          />
          <FormStrategies
            v-else-if="currentStep === 'auths'"
            v-model="authenticators"
            unique
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork?.constants.EDITOR_AUTHENTICATORS || []
            "
            title="Authenticators"
            description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
          />
          <FormValidation
            v-else-if="currentStep === 'validations'"
            v-model="validationStrategy"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork?.constants.EDITOR_PROPOSAL_VALIDATIONS || []
            "
            :available-voting-strategies="
              selectedNetwork?.constants
                .EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES || []
            "
            title="Proposal validation"
            description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
          />
          <FormStrategies
            v-else-if="currentStep === 'executions'"
            v-model="executionStrategies"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork?.constants.EDITOR_EXECUTION_STRATEGIES || []
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
            :chain-id="selectedNetwork?.chainId || 1"
            @errors="v => handleErrors('controller', v)"
          />
        </template>
        <template #submit-text> Create </template>
      </UiStepper>
    </div>
  </div>
</template>
