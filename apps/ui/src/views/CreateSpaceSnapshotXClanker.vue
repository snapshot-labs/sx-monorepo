<script setup lang="ts">
import { evmNetworks } from '@snapshot-labs/sx';
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
import { NetworkID, SpaceMetadata } from '@/types';

const DEFAULT_FORM = {
  name: '',
  description: '',
  avatar: '',
  proposalThreshold: '',
  safeAddress: '',
  executionQuorum: 1
};

const CONTRACT_ADDRESS_DEFINITION = {
  type: 'object',
  properties: {
    tokenAddress: {
      type: 'string',
      format: 'ethAddress',
      title: 'Clanker token address',
      examples: ['0x1234...']
    }
  }
};

const FORM_DEFINITION = {
  type: 'object',
  required: [
    'name',
    'description',
    'proposalThreshold',
    'safeAddress',
    'executionQuorum'
  ],
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      maxLength: 32,
      examples: ['Space name']
    },
    description: {
      type: 'string',
      format: 'long',
      title: 'About',
      maxLength: 160,
      examples: ['Space description']
    },
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
      type: 'integer',
      title: 'Execution quorum',
      tooltip: 'Minimum number of votes required for a proposal to be executed.'
    }
  }
};
const NETWORK_ID: NetworkID = 'base';
const PROPOSAL_THRESHOLD_DIVISOR = 1000n; // 0.1% of total supply
const EXECUTION_QUORUM_DIVISOR = 100n; // 1% of total supply
const MAX_VOTING_DURATION = 86400;

const network = getNetwork(NETWORK_ID);

const { predictSpaceAddress } = useActions();
useTitle('Create space');

const form = reactive(clone(DEFAULT_FORM));
const contractAddress = ref('');
const contractError = ref('');
const contractMetadata = ref<Record<string, any>>({});
const isLoading = ref(false);
const isCreating = ref(false);
const salt: Ref<string | null> = ref(null);
const predictedSpaceAddress: Ref<string | null> = ref(null);

const formErrors = computed(() => {
  const validator = getValidator(FORM_DEFINITION);
  return validator.validate(form);
});

const contractFormErrors = computed(() => {
  const validator = getValidator(CONTRACT_ADDRESS_DEFINITION);
  return validator.validate({ tokenAddress: contractAddress.value });
});

const validToken = computed(() => {
  return (
    contractAddress.value &&
    !Object.keys(contractFormErrors.value).length &&
    !contractError.value
  );
});

const metadataForm = computed<SpaceMetadata>(() => {
  return {
    name: form.name,
    avatar: form.avatar,
    description: form.description,
    cover: '',
    externalUrl: contractMetadata.value.website,
    twitter: contractMetadata.value.twitter || contractMetadata.value.x,
    github: '',
    discord: '',
    farcaster: contractMetadata.value.farcaster,
    terms: '',
    votingPowerSymbol: contractMetadata.value.symbol.slice(
      0,
      MAX_SYMBOL_LENGTH
    ),
    treasuries: [
      {
        name: 'Clanker treasury',
        chainId: network.chainId.toString(),
        address: form.safeAddress
      }
    ],
    labels: [],
    delegations: []
  };
});

const authenticators = computed(() => {
  const template = network.constants.EDITOR_AUTHENTICATORS.find(
    template =>
      template.address === evmNetworks[NETWORK_ID].Authenticators.EthTx
  );

  if (!template) return null;

  return [
    {
      id: crypto.randomUUID(),
      params: {},
      ...template
    }
  ];
});

const votingStrategies = computed(() => {
  const template = network.constants.EDITOR_VOTING_STRATEGIES.find(
    template => template.address === evmNetworks[NETWORK_ID].Strategies.OZVotes
  );

  if (!template) return null;

  return [
    {
      id: crypto.randomUUID(),
      params: {
        contractAddress: contractAddress.value,
        decimals: contractMetadata.value.decimals,
        symbol: metadataForm.value.votingPowerSymbol
      },
      ...template
    }
  ];
});

const validationStrategy = computed(() => {
  const template = network.constants.EDITOR_PROPOSAL_VALIDATIONS.find(
    template =>
      template.address ===
      evmNetworks[NETWORK_ID].ProposalValidations.VotingPower
  );
  const votingStrategiesTemplate =
    network.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES.find(
      template =>
        template.address === evmNetworks[NETWORK_ID].Strategies.OZVotes
    );

  if (!template || !votingStrategiesTemplate) return null;

  return {
    id: crypto.randomUUID(),
    params: {
      threshold: form.proposalThreshold,
      strategies: [
        {
          ...votingStrategiesTemplate,
          params: {
            contractAddress: contractAddress.value,
            decimals: contractMetadata.value.decimals,
            symbol: metadataForm.value.votingPowerSymbol
          }
        }
      ]
    },
    ...template
  };
});

const executionStrategies = computed(() => {
  return [
    {
      id: crypto.randomUUID(),
      params: {
        quorum: form.executionQuorum,
        controller: form.safeAddress,
        contractAddress: form.safeAddress
      },
      ...network.constants.EDITOR_EXECUTION_STRATEGIES.find(
        meta => meta.type === 'SimpleQuorumAvatar'
      )!
    }
  ];
});

async function handleFetchContractInfo() {
  try {
    isLoading.value = true;
    isCreating.value = false;
    contractError.value = '';

    contractMetadata.value = await getMetadata(
      contractAddress.value,
      Number(network.chainId)
    );

    const { name, description, totalSupply, decimals, imageUrl } =
      contractMetadata.value;

    form.name = name;
    form.description = description;

    if (imageUrl.startsWith('ipfs://')) {
      form.avatar = imageUrl;
    } else {
      const imageFile = await loadImageFromIpfs(imageUrl);
      const avatar = await imageUpload(imageFile);
      if (!avatar) {
        throw new Error('Failed to upload avatar');
      }
      form.avatar = avatar.url;
    }
    form.proposalThreshold = (
      totalSupply /
      PROPOSAL_THRESHOLD_DIVISOR /
      10n ** BigInt(decimals)
    ).toString();
    form.executionQuorum = Number(
      totalSupply / EXECUTION_QUORUM_DIVISOR / 10n ** BigInt(decimals)
    );

    isCreating.value = true;
  } catch (err) {
    console.error(err);
    contractError.value =
      'Failed to fetch your Clanker token data. Please ensure it is a valid token deployed on Base.';
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateSpace() {
  salt.value = getSalt();
  predictedSpaceAddress.value = await predictSpaceAddress(
    NETWORK_ID,
    salt.value
  );
}

watch(
  () => contractAddress.value,
  () => {
    contractMetadata.value = {};
    contractError.value = '';
    isCreating.value = false;
    Object.assign(form, clone(DEFAULT_FORM));

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
        isCreating &&
        salt &&
        predictedSpaceAddress &&
        validationStrategy &&
        authenticators &&
        votingStrategies &&
        executionStrategies
      "
      :network-id="NETWORK_ID"
      :salt="salt"
      :predicted-space-address="predictedSpaceAddress"
      :metadata="metadataForm"
      :settings="{
        votingDelay: 0,
        minVotingDuration: 0,
        maxVotingDuration: MAX_VOTING_DURATION
      }"
      :authenticators="authenticators"
      :validation-strategy="validationStrategy"
      :voting-strategies="votingStrategies"
      :execution-strategies="executionStrategies"
      :controller="form.safeAddress"
      @back="isCreating = false"
    />
    <div v-else class="s-box space-y-3 pt-8 px-4">
      <div class="flex items-center gap-3">
        <IC-clanker-full class="w-[210px] h-[40px] text-skin-link" />
        <div
          class="text-[42px] hidden md:block ml-3 -mt-3 leading-[28px] tracking-widest text-skin-border"
        >
          .....
        </div>
        <IC-zap class="size-[50px] text-skin-link hidden md:block" />
      </div>
      <div>
        <h1 class="mb-0">Create a DAO for your Clanker</h1>
        <p class="text-lg">
          Create a governance space for your Clanker token deployed on Base.
        </p>
      </div>
      <UiInputString
        v-model="contractAddress"
        :loading="isLoading"
        :disabled="isLoading"
        :definition="CONTRACT_ADDRESS_DEFINITION.properties.tokenAddress"
        :error="contractFormErrors.tokenAddress"
      />
      <div v-if="contractError" class="space-y-3">
        <UiAlert type="error">
          {{ contractError }}
        </UiAlert>
        <UiButton @click="handleFetchContractInfo">
          <IH-refresh />Retry
        </UiButton>
      </div>
      <template v-if="validToken && !isLoading">
        <UiInputStamp
          v-model="form.avatar"
          class="mt-4 border-0"
          :width="90"
          :height="90"
          :definition="{
            type: 'string',
            format: 'stamp',
            title: 'Avatar',
            default: `${NETWORK_ID}:${'0x2121212121212121212121212121212121212121212121212121212121212121'}`
          }"
        />
        <UiForm
          v-model="form"
          :definition="FORM_DEFINITION"
          :error="formErrors"
        />
        <UiButton
          class="w-full primary"
          :disabled="isLoading || Object.keys(formErrors).length > 0"
          :loading="isLoading"
          @click="handleCreateSpace"
        >
          Create space
        </UiButton>
      </template>
    </div>
  </div>
</template>
