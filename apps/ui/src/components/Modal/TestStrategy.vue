<script setup lang="ts">
import { getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { evmNetworks, offchainNetworks } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { getVotingPower, VotingPowerItem } from '@/queries/votingPower';
import { ChainId, NetworkID } from '@/types';

const DEFINITION = {
  type: 'object',
  title: 'Test strategy',
  additionalProperties: false,
  required: ['address'],
  properties: {
    address: {
      type: 'string',
      format: 'address',
      title: 'Address',
      examples: ['0x1234567890abcdef1234567890abcdef12345678']
    }
  }
};

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  spaceId: string;
  votingPowerSymbol: string;
  strategies: StrategyConfig[];
  chainId?: ChainId;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const showPicker = ref(false);
const isLoading = ref(false);
const hasError = ref(false);
const searchValue = ref('');
const votingPower = ref<VotingPowerItem | null>(null);
const form = ref({
  address: ''
});

const validator = getValidator(DEFINITION);

const formErrors = computed(() => {
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const hasFormErrors = computed(() => {
  return Object.keys(formErrors.value).length > 0;
});

function handlePick(address: string) {
  form.value.address = address;
  showPicker.value = false;
  handleSubmit();
}

async function handleSubmit() {
  if (hasFormErrors.value) {
    return;
  }

  isLoading.value = true;
  hasError.value = false;
  votingPower.value = null;

  try {
    let strategiesParams: any[] = [];
    let strategiesMetadata: any[] = [];

    if (offchainNetworks.includes(props.networkId)) {
      strategiesParams = props.strategies.map(strategy => {
        return {
          name: strategy.name,
          network: String(strategy.chainId ?? props.chainId),
          params: strategy.params
        };
      });
    } else {
      strategiesParams = await Promise.all(
        props.strategies.map(async strategy => {
          if (evmNetworks.includes(props.networkId)) {
            return strategy.generateParams
              ? (await strategy.generateParams(strategy.params))[0]
              : '0x';
          }

          return strategy.generateParams
            ? (await strategy.generateParams(strategy.params)).join(',')
            : '';
        })
      );

      strategiesMetadata = (
        await Promise.all(
          props.strategies.map(async strategy =>
            strategy.generateMetadata
              ? await strategy.generateMetadata(strategy.params)
              : {}
          )
        )
      ).map((metadata: any) => ({
        payload: null,
        ...metadata.properties
      }));
    }

    votingPower.value = await getVotingPower(
      form.value.address,
      null,
      {
        id: props.spaceId,
        snapshot_chain_id: props.chainId as string | undefined,
        network: props.networkId,
        voting_power_symbol: props.votingPowerSymbol
      },
      [
        props.strategies.map(s => s.address),
        strategiesParams,
        strategiesMetadata
      ]
    );
  } catch {
    hasError.value = true;
    votingPower.value = null;
  }

  isLoading.value = false;
}

watch(
  () => props.open,
  () => {
    form.value.address = '';
    showPicker.value = false;
    votingPower.value = null;
    hasError.value = false;
    isLoading.value = false;
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Test {{ strategies.length > 1 ? 'strategies' : 'strategy' }}</h3>
      <template v-if="showPicker">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
        <UiModalSearchInput
          ref="searchInput"
          v-model="searchValue"
          placeholder="Search name or paste address"
        />
      </template>
    </template>
    <template v-if="showPicker">
      <PickerContact
        :loading="false"
        :search-value="searchValue"
        @pick="handlePick"
      />
    </template>
    <div v-else class="s-box p-4 space-y-3">
      <UiForm
        v-model="form"
        :definition="DEFINITION"
        :error="formErrors"
        @pick="showPicker = true"
      />
      <MessageErrorFetchPower
        v-if="hasError"
        type="voting"
        @fetch="handleSubmit"
      />
      <div v-else-if="votingPower" class="space-y-2.5">
        <div class="flex items-center justify-between">
          <UiEyebrow>Voting power</UiEyebrow>
          <span
            v-if="votingPower.votingPowers.length > 1"
            class="text-skin-link"
            v-text="getFormattedVotingPower(votingPower)"
          />
        </div>
        <VotingPowerList
          class="border rounded-lg"
          :voting-power="votingPower"
          :network-id="networkId"
        />
      </div>
    </div>
    <template #footer>
      <UiButton
        class="w-full"
        primary
        :disabled="hasFormErrors || isLoading"
        :loading="isLoading"
        @click="handleSubmit"
      >
        Test {{ strategies.length > 1 ? 'strategies' : 'strategy' }}
      </UiButton>
    </template>
  </UiModal>
</template>
