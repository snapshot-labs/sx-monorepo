<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import type { NetworkID } from '@/types';

const props = defineProps<{
  form: any;
  selectedNetworkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const definition = computed(() => {
  return {
    type: 'object',
    title: 'SpaceSettings',
    additionalProperties: true,
    required: ['votingDelay', 'minVotingDuration', 'maxVotingDuration'],
    properties: {
      votingDelay: {
        type: 'number',
        format: 'duration',
        title: 'Voting delay'
      },
      minVotingDuration: {
        type: 'number',
        format: 'duration',
        title: 'Min. voting duration'
      },
      maxVotingDuration: {
        type: 'number',
        format: 'duration',
        title: 'Max. voting duration'
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
