<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';

const props = defineProps<{
  form: any;
  selectedNetworkId: NetworkID;
  title?: string;
  description?: string;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const isOffchainNetwork = computed(() =>
  offchainNetworks.includes(props.selectedNetworkId)
);

const definition = computed(() => {
  return {
    type: 'object',
    title: 'SpaceSettings',
    additionalProperties: true,
    required: [
      'votingDelay',
      'minVotingDuration',
      !isOffchainNetwork.value ? 'maxVotingDuration' : undefined
    ].filter(Boolean),
    properties: {
      votingDelay: {
        type: 'number',
        format: 'duration',
        title: 'Voting delay',
        ...(isOffchainNetwork.value
          ? {
              maximum: 2592000,
              errorMessage: {
                maximum: 'Delay must be less than 30 days'
              }
            }
          : {})
      },
      minVotingDuration: {
        type: 'number',
        format: 'duration',
        title: isOffchainNetwork.value
          ? 'Voting period'
          : 'Min. voting duration',
        ...(isOffchainNetwork.value
          ? {
              maximum: 15552000,
              errorMessage: {
                maximum: 'Period must be less than 180 days'
              }
            }
          : {})
      },
      ...(isOffchainNetwork.value
        ? {}
        : {
            maxVotingDuration: {
              type: 'number',
              format: 'duration',
              title: 'Max. voting duration'
            }
          })
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
  <UiContainerSettings :title="title" :description="description">
    <div class="s-box [&>*]:space-y-3">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
        class="s-input-pb-0"
      />
    </div>
  </UiContainerSettings>
</template>
