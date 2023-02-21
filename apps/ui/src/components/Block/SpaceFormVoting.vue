<script setup lang="ts">
import { computed } from 'vue';
import { validateForm } from '@/helpers/validation';

const props = defineProps<{
  form: any;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const definition = {
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

const formErrors = computed(() => {
  const errors = validateForm(definition, props.form);

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
