<script setup lang="ts">
import { getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
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

defineEmits<{
  (e: 'close');
}>();

const isPickerShown = ref(false);
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
  isPickerShown.value = false;
  handleSubmit();
}

async function handleSubmit() {
  if (hasFormErrors.value) {
    return;
  }

  isLoading.value = true;
  votingPower.value = null;

  try {
    hasError.value = false;

    votingPower.value = await getVotingPower(
      form.value.address,
      null,
      {
        id: props.spaceId,
        snapshot_chain_id: props.chainId as number | undefined,
        network: props.networkId,
        voting_power_symbol: props.votingPowerSymbol
      },
      [props.strategies.map(s => s.name), props.strategies.map(s => s), []]
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
    isPickerShown.value = false;
    votingPower.value = null;
    hasError.value = false;
    isLoading.value = false;
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Test strategy</h3>
      <template v-if="isPickerShown">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="isPickerShown = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
        <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
          <IH-search class="mx-2" />
          <input
            ref="searchInput"
            v-model="searchValue"
            type="text"
            placeholder="Search name or paste address"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <template v-if="isPickerShown">
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
        @pick="isPickerShown = true"
      />
      <MessageErrorFetchPower
        v-if="hasError"
        type="voting"
        @fetch="handleSubmit"
      />
      <div v-else-if="votingPower" class="space-y-2.5">
        <div class="flex items-center justify-between">
          <h4 class="eyebrow">Voting power</h4>
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
        Test strategy
      </UiButton>
    </template>
  </UiModal>
</template>
