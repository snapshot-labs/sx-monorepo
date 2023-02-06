<script setup lang="ts">
import { ref, reactive, computed, Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useActions } from '@/composables/useActions';
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { enabledNetworks, getNetwork } from '@/networks';
import type { NetworkID, SpaceSettings } from '@/types';

type MetadataState = { name: string; about?: string; website?: string };

const metadataDefinition = {
  type: 'object',
  title: 'Space',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      examples: ['Space name']
    },
    about: {
      type: 'string',
      format: 'long',
      title: 'About',
      examples: ['Space description']
    },
    website: {
      type: 'string',
      title: 'Website',
      examples: ['Space website URL']
    }
  }
};

const settingsDefinition = {
  type: 'object',
  title: 'SpaceSettings',
  additionalProperties: false,
  required: [
    'votingDelay',
    'minVotingDuration',
    'maxVotingDuration',
    'proposalThreshold',
    'quorum'
  ],
  properties: {
    votingDelay: {
      type: 'number',
      title: 'Voting delay',
      examples: ['0']
    },
    minVotingDuration: {
      type: 'number',
      title: 'Min. voting duration',
      examples: ['0']
    },
    maxVotingDuration: {
      type: 'number',
      title: 'Max. voting duration',
      examples: ['86400']
    },
    proposalThreshold: {
      type: 'string',
      format: 'uint256',
      title: 'Proposal threshold',
      examples: ['1']
    },
    quorum: {
      type: 'string',
      format: 'uint256',
      title: 'Quorum',
      examples: ['1']
    }
  }
};

const availableNetworks = enabledNetworks.map(id => ({
  id,
  name: getNetwork(id).name
}));

const router = useRouter();
const { createSpace } = useActions();

const sending = ref(false);
const selectedNetworkId: Ref<NetworkID> = ref('sn-tn2');
const metadataForm: MetadataState = reactive(
  clone({
    name: '',
    about: '',
    website: ''
  })
);
const settingsForm: SpaceSettings = reactive(
  clone({
    votingDelay: 0,
    minVotingDuration: 0,
    maxVotingDuration: 86400,
    proposalThreshold: '1',
    quorum: '1'
  })
);

const metadataFormErrors = computed(() => validateForm(metadataDefinition, metadataForm));
const settingsFormErrors = computed(() => validateForm(settingsDefinition, settingsForm));
const disabled = computed(
  () =>
    Object.keys(metadataFormErrors.value).length > 0 ||
    Object.keys(settingsFormErrors.value).length > 0
);

async function handleSubmit() {
  sending.value = true;

  try {
    const result = await createSpace(
      selectedNetworkId.value,
      {
        name: metadataForm.name,
        description: metadataForm.about || '',
        external_url: metadataForm.website || ''
      },
      settingsForm
    );

    if (result) router.back();
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div>
    <Container class="pt-5">
      <h2>Deploy space</h2>
      <div class="s-box pt-4">
        <SIObject
          v-model="metadataForm"
          :error="metadataFormErrors"
          :definition="metadataDefinition"
        />
      </div>

      <fieldset class="my-3">
        <legend>Network:</legend>

        <div v-for="network in availableNetworks" :key="network.id">
          <input v-model="selectedNetworkId" :value="network.id" type="radio" />
          <label class="ml-2" :for="network.id">{{ network.name }}</label>
        </div>
      </fieldset>

      <div class="s-box">
        <h3 class="mb-2">Settings</h3>
        <SIObject
          v-model="settingsForm"
          :error="settingsFormErrors"
          :definition="settingsDefinition"
        />
      </div>
      <UiButton class="w-full" :loading="sending" :disabled="disabled" @click="handleSubmit">
        Create
      </UiButton>
    </Container>
  </div>
</template>
