<script setup lang="ts">
import { Contract, ContractFactory } from '@ethersproject/contracts';
import { StepRecords } from '@/components/Ui/Stepper.vue';
import { useWeb3 } from '@/composables/useWeb3';
import {
  SPACE_CONTRACT,
  VANILLA_AUTHENTICATOR,
  VANILLA_EXECUTION_STRATEGY,
  VANILLA_PROPOSAL_VALIDATION_STRATEGY,
  VANILLA_VOTING_STRATEGY
} from '@/contracts/contract-info';
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

// Add loading states
const isInitializing = ref(false);
const deploymentProgress = ref('');
const initializationProgress = ref('');

const deployedAddresses = ref<{
  spaceContract: string;
  vanillaAuthenticator: string;
  vanillaProposalValidationStrategy: string;
  vanillaVotingStrategy: string;
  vanillaExecutionStrategy: string;
} | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const deployContract = async ({
  abi,
  bytecode,
  args = [],
  name
}: {
  abi: any;
  bytecode: string;
  args?: any[];
  name?: string;
}) => {
  if (!auth.value?.provider) throw new Error('No provider available');

  if (name) {
    deploymentProgress.value = `Deploying ${name}...`;
  }

  console.log(`Deploying ${name || 'Contract'}...`);
  console.log(`Bytecode length: ${bytecode.length} characters`);
  if (args.length > 0) console.log(`Constructor args:`, args);

  // Validate bytecode
  if (!bytecode || bytecode === '0x' || bytecode.length < 10) {
    throw new Error(
      `Invalid bytecode for ${name}. Contract may not be compiled correctly.`
    );
  }

  const signer = auth.value.provider.getSigner();
  const factory = new ContractFactory(abi, bytecode, signer);

  try {
    // Deploy without manual gas limit - let the network estimate
    const contract = await factory.deploy(...args);

    console.log(
      `${name || 'Contract'} deployment tx:`,
      contract.deployTransaction.hash
    );

    // Wait for deployment
    await contract.deployed();

    console.log(`${name || 'Contract'} deployed at:`, contract.address);

    return contract.address;
  } catch (error) {
    console.error(`Failed to deploy ${name}:`, error);

    // Enhanced error reporting
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error(
        `Gas estimation failed for ${name}. The contract may be too complex or have invalid constructor parameters.`
      );
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error(
        `Insufficient funds to deploy ${name}. Please ensure you have enough ETH for gas fees.`
      );
    } else if (error.message.includes('execution reverted')) {
      throw new Error(
        `Contract deployment reverted for ${name}. Check constructor parameters and contract code.`
      );
    }

    throw new Error(`Failed to deploy ${name}: ${error.message}`);
  }
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
  initializationProgress.value = 'Initializing space contract...';

  try {
    console.log('Starting space initialization...');

    const data0 = {
      addr: contractAddress?.vanillaProposalValidationStrategy,
      params: '0x'
    };
    const data1 = {
      addr: contractAddress?.vanillaVotingStrategy,
      params: '0x'
    };
    const votingData = settingsForm;
    const profileData = metadataForm;

    const initData = {
      owner: controller.value,
      votingDelay: votingData.votingDelay,
      minVotingDuration: votingData.minVotingDuration,
      maxVotingDuration: votingData.maxVotingDuration,
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

    const signer = auth.value.provider.getSigner();
    const spaceContract = new Contract(
      contractAddress.spaceContract,
      SPACE_CONTRACT.abi,
      signer
    );

    const tx = await spaceContract.initialize(initData);

    console.log('Initialization transaction:', tx.hash);

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error('Initialization transaction failed');
    }

    console.log('Space initialized successfully!');
  } catch (err) {
    console.error('Initialization failed:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'An unknown error occurred';
    error.value = `Initialization failed: ${errorMessage}`;
    throw err;
  } finally {
    isInitializing.value = false;
  }
};

const handleSubmit = async () => {
  if (!auth.value?.provider) {
    error.value = 'Please connect your wallet first';
    return;
  }

  isLoading.value = true;
  error.value = null;
  deployedAddresses.value = null;

  try {
    console.log('Starting contract deployment...');
    console.log('Network:', selectedNetworkId.value);
    console.log('Account:', auth.value.account);

    // Deploy contracts sequentially to avoid nonce issues
    deploymentProgress.value = 'Deploying Space Contract...';
    const spaceContract = await deployContract({
      abi: SPACE_CONTRACT.abi,
      bytecode: SPACE_CONTRACT.bytecode,
      name: 'Space Contract'
    });

    deploymentProgress.value = 'Deploying Vanilla Authenticator...';
    const vanillaAuthenticator = await deployContract({
      abi: VANILLA_AUTHENTICATOR.abi,
      bytecode: VANILLA_AUTHENTICATOR.bytecode,
      name: 'Vanilla Authenticator'
    });

    deploymentProgress.value = 'Deploying Proposal Validation Strategy...';
    const vanillaProposalValidationStrategy = await deployContract({
      abi: VANILLA_PROPOSAL_VALIDATION_STRATEGY.abi,
      bytecode: VANILLA_PROPOSAL_VALIDATION_STRATEGY.bytecode,
      name: 'Proposal Validation Strategy'
    });

    deploymentProgress.value = 'Deploying Voting Strategy...';
    const vanillaVotingStrategy = await deployContract({
      abi: VANILLA_VOTING_STRATEGY.abi,
      bytecode: VANILLA_VOTING_STRATEGY.bytecode,
      name: 'Voting Strategy'
    });

    deploymentProgress.value = 'Deploying Execution Strategy...';
    const vanillaExecutionStrategy = await deployContract({
      abi: VANILLA_EXECUTION_STRATEGY.abi,
      bytecode: VANILLA_EXECUTION_STRATEGY.bytecode,
      args: [controller.value, 1],
      name: 'Execution Strategy'
    });

    deployedAddresses.value = {
      spaceContract,
      vanillaAuthenticator,
      vanillaProposalValidationStrategy,
      vanillaVotingStrategy,
      vanillaExecutionStrategy
    };

    console.log('All contracts deployed:', deployedAddresses.value);

    storeDeployedAddresses(deployedAddresses.value);
    isLoading.value = false;

    // Now initialize the space
    await initialize(deployedAddresses.value);

    confirming.value = true;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'An unknown error occurred';
    error.value = `Deployment failed: ${errorMessage}`;
    console.error('Deployment failed:', err);
    isLoading.value = false;
    isInitializing.value = false;
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
        <span>{{ deploymentProgress || 'Deploying contracts...' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UiLoading v-if="isInitializing" class="mr-2" />
        <span>{{ initializationProgress || 'Initializing space...' }}</span>
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
            :space-id="''"
            :voting-power-symbol="metadataForm.votingPowerSymbol"
            :network-id="selectedNetworkId"
            :available-strategies="
              selectedNetwork?.constants.EDITOR_VOTING_STRATEGIES || []
            "
            :show-test-button="true"
            title="Voting strategies"
            description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
          />
          <FormStrategies
            v-else-if="currentStep === 'auths'"
            v-model="authenticators"
            :space-id="''"
            :voting-power-symbol="metadataForm.votingPowerSymbol"
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
            :space-id="''"
            :voting-power-symbol="metadataForm.votingPowerSymbol"
            title="Proposal validation"
            description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
          />
          <FormStrategies
            v-else-if="currentStep === 'executions'"
            v-model="executionStrategies"
            :space-id="''"
            :voting-power-symbol="metadataForm.votingPowerSymbol"
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
