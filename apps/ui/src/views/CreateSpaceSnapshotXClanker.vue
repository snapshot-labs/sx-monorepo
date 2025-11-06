<script setup lang="ts">
import { BigNumber } from '@ethersproject/bignumber';
import { getMetadata } from '@/helpers/clanker';
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import {
  clone,
  getSalt,
  imageUpload,
  loadImageFromIpfs
} from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, SpaceMetadata, SpaceSettings } from '@/types';
import ICClanker from '~icons/c/clanker';

const CONTRACT_ADDRESS_DEFINITION = {
  type: 'object',
  required: ['tokenAddress'],
  properties: {
    tokenAddress: {
      type: 'string',
      format: 'ethAddress',
      title: 'Clanker token address',
      examples: ['0x1234...']
    }
  }
};

const EXTRA_DEFINITION = {
  type: 'object',
  required: ['proposalThreshold', 'safeAddress', 'executionQuorum'],
  properties: {
    proposalThreshold: {
      type: 'string',
      format: 'uint256',
      title: 'Proposal threshold',
      tooltip: 'Minimum number of tokens required to create a proposal.'
    },
    safeAddress: {
      type: 'string',
      format: 'ethAddress',
      title: 'Safe address',
      tooltip: 'The treasury and controller of the space.',
      examples: ['0x1234...'],
      showControls: false
    },
    executionQuorum: {
      type: 'string',
      format: 'uint256',
      title: 'Execution quorum',
      tooltip: 'Minimum number of votes required for a proposal to be executed.'
    }
  }
};
const NETWORK_ID: NetworkID = 'base';
const MAX_NAME_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 160;
const PROPOSAL_THRESHOLD_DIVISOR = 1000n;
const EXECUTION_QUORUM_DIVISOR = 100n;
const MAX_VOTING_DURATION = 86400;

const { current, goTo } = useStepper(['contract', 'profile', 'confirming']);
const { predictSpaceAddress } = useActions();
useTitle('Create space');

const form = reactive({
  proposalThreshold: '1',
  executionQuorum: '1',
  safeAddress: ''
});
const contractAddress = ref('');
const contractError = ref('');
const contractMetadata = ref<Record<string, any>>({});
const loading = ref(false);
const salt: Ref<string | null> = ref(null);
const predictedSpaceAddress: Ref<string | null> = ref(null);
const authenticators = ref([] as StrategyConfig[]);
const validationStrategy: Ref<StrategyConfig | null> = ref(null);
const votingStrategies = ref([] as StrategyConfig[]);
const executionStrategies = ref([] as StrategyConfig[]);
const settingsForm: SpaceSettings = reactive(
  clone({
    votingDelay: 0,
    minVotingDuration: 0,
    maxVotingDuration: MAX_VOTING_DURATION
  })
);
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
    farcaster: '',
    terms: '',
    votingPowerSymbol: '',
    treasuries: [],
    labels: [],
    delegations: []
  })
);

const selectedNetwork = computed(() => getNetwork(NETWORK_ID));

const formErrors = computed(() => {
  const validator = getValidator(EXTRA_DEFINITION);
  return validator.validate(form);
});

const contractFormErrors = computed(() => {
  const validator = getValidator(CONTRACT_ADDRESS_DEFINITION);
  return validator.validate({ tokenAddress: contractAddress.value });
});

const validToken = computed(() => {
  return !Object.keys(contractFormErrors.value).length && !contractError.value;
});

async function handleFetchContractInfo() {
  try {
    loading.value = true;
    contractError.value = '';

    contractMetadata.value = await getMetadata(
      contractAddress.value,
      Number(selectedNetwork.value.chainId)
    );
    if (!contractMetadata.value.symbol) {
      throw new Error('Invalid Clanker token data');
    }

    metadataForm.name = contractMetadata.value.name.slice(0, MAX_NAME_LENGTH);
    metadataForm.votingPowerSymbol = contractMetadata.value.symbol.slice(
      0,
      MAX_SYMBOL_LENGTH
    );
    metadataForm.description = contractMetadata.value.description.slice(
      0,
      MAX_DESCRIPTION_LENGTH
    );

    // Handle image URL based on whether it's already an IPFS URL
    if (contractMetadata.value.imageUrl.startsWith('ipfs://')) {
      metadataForm.avatar = contractMetadata.value.imageUrl;
    } else {
      const imageFile = await loadImageFromIpfs(
        contractMetadata.value.imageUrl
      );
      const avatar = await imageUpload(imageFile);
      if (!avatar) {
        throw new Error('Failed to upload avatar');
      }
      metadataForm.avatar = avatar.url;
    }
    metadataForm.externalUrl = contractMetadata.value.website;
    metadataForm.farcaster = contractMetadata.value.farcaster;
    metadataForm.twitter =
      contractMetadata.value.twitter || contractMetadata.value.x;
    form.proposalThreshold = (
      contractMetadata.value.totalSupply /
      10n ** BigInt(contractMetadata.value.decimals) /
      PROPOSAL_THRESHOLD_DIVISOR
    ).toString();
    form.executionQuorum = (
      contractMetadata.value.totalSupply /
      10n ** BigInt(contractMetadata.value.decimals) /
      EXECUTION_QUORUM_DIVISOR
    ).toString();

    goTo('profile');
  } catch (err) {
    console.error(err);
    contractError.value =
      'Failed to fetch your Clanker token data. Please ensure it is a valid token deployed on Base.';
  } finally {
    loading.value = false;
  }
}

async function handleCreateSpace() {
  salt.value = getSalt();
  predictedSpaceAddress.value = await predictSpaceAddress(
    NETWORK_ID,
    salt.value
  );

  authenticators.value = [
    {
      id: crypto.randomUUID(),
      params: {},
      ...selectedNetwork.value.constants.EDITOR_AUTHENTICATORS.find(
        meta => meta.address === '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1'
      )!
    }
  ];

  votingStrategies.value = [
    {
      id: crypto.randomUUID(),
      params: {
        contractAddress: contractAddress.value,
        decimals: contractMetadata.value.decimals,
        symbol: metadataForm.votingPowerSymbol
      },
      ...selectedNetwork.value.constants.EDITOR_VOTING_STRATEGIES.find(
        meta => meta.address === '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe'
      )!
    }
  ];

  validationStrategy.value = {
    id: crypto.randomUUID(),
    params: {
      threshold: BigNumber.from(form.proposalThreshold.toString()),
      strategies: [
        {
          ...selectedNetwork.value.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES.find(
            meta =>
              meta.address === '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe'
          )!,
          params: {
            contractAddress: contractAddress.value,
            decimals: contractMetadata.value.decimals,
            symbol: metadataForm.votingPowerSymbol
          }
        }
      ]
    },
    ...selectedNetwork.value.constants.EDITOR_PROPOSAL_VALIDATIONS.find(
      meta => meta.address === '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
    )!
  };

  executionStrategies.value = [
    {
      id: crypto.randomUUID(),
      params: {
        quorum: BigNumber.from(form.executionQuorum.toString()),
        controller: form.safeAddress,
        contractAddress: form.safeAddress
      },
      ...selectedNetwork.value.constants.EDITOR_EXECUTION_STRATEGIES.find(
        meta => meta.type === 'SimpleQuorumAvatar'
      )!
    }
  ];

  metadataForm.treasuries = [
    {
      name: 'Clanker treasury',
      chainId: selectedNetwork.value.chainId.toString(),
      address: form.safeAddress
    }
  ];

  goTo('confirming');
}

watch(
  () => contractAddress.value,
  () => {
    contractMetadata.value = {};
    contractError.value = '';

    if (validToken.value) {
      handleFetchContractInfo();
    }
  }
);
</script>
<template>
  <div class="max-w-[592px] mx-auto">
    <CreateDeploymentProgress
      v-if="
        current === 'confirming' &&
        salt &&
        predictedSpaceAddress &&
        validationStrategy
      "
      :network-id="NETWORK_ID"
      :salt="salt"
      :predicted-space-address="predictedSpaceAddress"
      :metadata="metadataForm"
      :settings="settingsForm"
      :authenticators="authenticators"
      :validation-strategy="validationStrategy"
      :voting-strategies="votingStrategies"
      :execution-strategies="executionStrategies"
      :controller="form.safeAddress"
      @back="goTo('profile')"
    />
    <div v-else class="flex flex-col s-box pt-5 px-4 gap-5">
      <div class="flex flex-col gap-2 mt-5">
        <div class="mb-1">
          <ICClanker
            class="size-12 text-skin-link inline-block bg-skin-bg rounded-full"
          />
          <IC-zap
            class="size-12 border rounded-full text-skin-border border-skin-border -ml-5 inline-block relative z-[-1]"
          />
        </div>
        <div>
          <h1 class="mb-0">Create a DAO for your Clanker</h1>
          <p class="text-lg">
            Create a governance space for your Clanker token deployed on Base.
          </p>
        </div>
        <UiInputString
          v-model="contractAddress"
          :loading="loading"
          :disabled="loading"
          :definition="CONTRACT_ADDRESS_DEFINITION.properties.tokenAddress"
          :error="contractFormErrors.tokenAddress"
        />
        <UiAlert v-if="contractError" type="error" class="mb-2">
          {{ contractError }}
          <button type="button" @click="handleFetchContractInfo">Retry.</button>
        </UiAlert>
      </div>
      <template v-if="validToken && contractMetadata.name">
        <div class="flex w-full gap-4 items-start">
          <img
            :src="contractMetadata.imageUrl"
            :width="90"
            :height="90"
            :alt="contractMetadata.name"
            class="size-[90px] rounded-lg shrink-0"
          />
          <div class="w-full">
            <div class="flex gap-1 items-center justify-between">
              <h2>{{ contractMetadata.name }}</h2>
              <button><IH-Pencil /></button>
            </div>
            <div class="leading-6">{{ contractMetadata.description }}</div>
          </div>
        </div>

        <div class="space-y-4">
          <UiForm
            v-model="form"
            :definition="EXTRA_DEFINITION"
            :error="formErrors"
          />
          <UiButton
            class="w-full primary"
            :disabled="loading || Object.keys(formErrors).length > 0"
            :loading="loading"
            @click="handleCreateSpace"
          >
            Create space
          </UiButton>
        </div>
      </template>
    </div>
  </div>
</template>
