<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { evmNetworks } from '@/networks';
import type { NetworkID } from '@/types';

const props = defineProps<{
  form: any;
  selectedNetworkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const definition = {
  type: 'object',
  title: 'SpaceSettings',
  additionalProperties: true,
  required: [
    'votingDelay',
    'minVotingDuration',
    'maxVotingDuration',
    'proposalThreshold',
    ...(!evmNetworks.includes(props.selectedNetworkId) ? ['quorum'] : [])
  ],
  properties: {
    votingDelay: {
      type: 'number',
      title: 'Voting delay in blocks'
    },
    minVotingDuration: {
      type: 'number',
      title: 'Min. voting duration in blocks'
    },
    maxVotingDuration: {
      type: 'number',
      title: 'Max. voting duration in blocks'
    },
    ...(!evmNetworks.includes(props.selectedNetworkId) && {
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
    })
  }
};

const formErrors = computed(() => {
  const errors = validateForm(definition, props.form);

  if (props.form.minVotingDuration > props.form.maxVotingDuration) {
    errors.maxVotingDuration =
      'Max. voting duration must be equal to or greater than min. voting duration.';
  }

  emit('errors', errors);

  return errors;
});
</script>

<template>
  <h3>Voting settings</h3>
  <div class="s-box pt-4">
    <SIObject :model-value="form" :error="formErrors" :definition="definition" />
  </div>
</template>
