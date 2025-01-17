<script lang="ts" setup>
import UiSelector from '@/components/Ui/Selector.vue';
import { VALIDATION_TYPES_INFO } from '@/helpers/constants';
import { NetworkID, Validation } from '@/types';
import IHBeaker from '~icons/heroicons-outline/beaker';
import IHUser from '~icons/heroicons-outline/user';

type ValidationDetailId =
  | 'only-members'
  | 'basic'
  | 'passport-gated'
  | 'arbitrum'
  | 'karma-eas-attestation';
type ValidationDetailsExtra = {
  tag?: string;
  icon?: Component;
  withoutParams?: boolean;
};
type ValidationDetails = (typeof VALIDATION_TYPES_INFO)[ValidationDetailId] &
  ValidationDetailsExtra;
type ValidationRecords = Record<ValidationDetailId, ValidationDetails>;

const PROPOSAL_VALIDATIONS: Record<ValidationDetailId, ValidationDetailsExtra> =
  {
    'only-members': {
      icon: IHUser,
      withoutParams: true
    },
    basic: {},
    'passport-gated': {
      tag: 'Beta',
      icon: IHBeaker
    },
    arbitrum: {},
    'karma-eas-attestation': {}
  } as const;

const validation = defineModel<Validation | null>({ required: true });

defineProps<{
  networkId: NetworkID;
  snapshotChainId: number;
}>();

const isSelectValidationModalOpen = ref(false);
const initialValidation = ref<Validation>();

const availableValidations = computed(() => {
  return Object.keys(PROPOSAL_VALIDATIONS).reduce((acc, id) => {
    acc[id] = {
      ...VALIDATION_TYPES_INFO[id],
      ...PROPOSAL_VALIDATIONS[id]
    };
    return acc;
  }, {} as ValidationRecords);
});

function handleClick(validationId: string) {
  const selectedValidation = {
    name: validationId,
    params: {}
  };

  if (PROPOSAL_VALIDATIONS[validationId].withoutParams) {
    validation.value = selectedValidation;
    return;
  }

  initialValidation.value =
    validation.value?.name === validationId
      ? validation.value
      : selectedValidation;

  isSelectValidationModalOpen.value = true;
}
</script>

<template>
  <div>
    <div class="space-y-3">
      <UiSelectorCard
        :is="UiSelector"
        v-for="(type, id) in availableValidations"
        :key="id"
        :item="{ ...type, key: id }"
        :selected="validation?.name === id"
        :is-active="validation?.name === id"
        @click="handleClick"
      />
    </div>
    <teleport to="#modal">
      <ModalSelectValidation
        type="proposal"
        :open="isSelectValidationModalOpen"
        :network-id="networkId"
        :default-chain-id="snapshotChainId"
        :current="initialValidation"
        :skip-menu="true"
        @close="isSelectValidationModalOpen = false"
        @save="value => (validation = value)"
      />
    </teleport>
  </div>
</template>
