<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { getCurrentName } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import type { NetworkID } from '@/types';

const props = defineProps<{
  form: any;
  selectedNetworkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const definition = computed(() => {
  const network = getNetwork(props.selectedNetworkId);
  const useDuration = network.currentUnit === 'second';

  return {
    type: 'object',
    title: 'SpaceSettings',
    additionalProperties: true,
    required: ['votingDelay', 'minVotingDuration', 'maxVotingDuration'],
    properties: {
      votingDelay: {
        type: 'number',
        format: useDuration ? 'duration' : undefined,
        title: useDuration
          ? 'Voting delay'
          : `Voting delay in ${getCurrentName(network.currentUnit)}`
      },
      minVotingDuration: {
        type: 'number',
        format: useDuration ? 'duration' : undefined,
        title: useDuration
          ? 'Min. voting duration'
          : `Min. voting duration in ${getCurrentName(network.currentUnit)}`
      },
      maxVotingDuration: {
        type: 'number',
        format: useDuration ? 'duration' : undefined,
        title: useDuration
          ? 'Max. voting duration'
          : `Max. voting duration in ${getCurrentName(network.currentUnit)}`
      }
    }
  };
});

const formErrors = computed(() => {
  const errors = validateForm(definition.value, props.form);

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
