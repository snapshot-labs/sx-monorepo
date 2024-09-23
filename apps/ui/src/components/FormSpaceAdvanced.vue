<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const CHILDREN_LIMIT = 16;

const PARENT_SPACE_DEFINITION = {
  type: 'string',
  title: 'Main space',
  examples: ['pistachiodao.eth'],
  tooltip:
    'The space that this space is a sub-space of will be displayed on the space page'
};

const SUB_SPACE_DEFINITION = {
  type: 'string',
  title: 'Sub-space(s)',
  examples: ['pistachiodao.eth'],
  tooltip: 'Related Sub-spaces listed here will be displayed on the space page'
};

const TERMS_OF_SERVICES_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Terms of services',
  maxLength: 256,
  examples: ['https://example.com/terms'],
  tooltip:
    'Users will be required to accept these terms once before they can create a proposal or cast a vote'
};

const CUSTOM_DOMAIN_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Domain name',
  maxLength: 64,
  examples: ['vote.balancer.fi']
};

const parent = defineModel<string>('parent', { required: true });
const children = defineModel<string[]>('children', { required: true });
const termsOfServices = defineModel<string>('termsOfServices', {
  required: true
});
const customDomain = defineModel<string>('customDomain', { required: true });
const isPrivate = defineModel<boolean>('isPrivate', { required: true });

const props = defineProps<{
  networkId: NetworkID;
  spaceId: string;
  isController: boolean;
}>();

const emit = defineEmits<{
  (e: 'updateValidity', valid: boolean): void;
  (e: 'deleteSpace');
}>();

const { addNotification } = useUiStore();

const parentSpaceValidationResult = ref(
  null as { value: string; valid: boolean } | null
);
const childInput = ref('');
const isAddingChild = ref(false);
const isDeleteSpaceModalOpen = ref(false);

const network = computed(() => getNetwork(props.networkId));
const canAddParentSpace = computed(() => children.value.length === 0);
const canAddChildSpace = computed(() => parent.value.length === 0);
const formErrors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'Advanced',
    additionalProperties: false,
    required: [],
    properties: {
      parent: PARENT_SPACE_DEFINITION,
      childInput: SUB_SPACE_DEFINITION,
      termsOfServices: TERMS_OF_SERVICES_DEFINITION
    }
  });

  const errors = validator.validate(
    {
      parent: parent.value,
      childInput: childInput.value,
      termsOfServices: termsOfServices.value
    },
    {
      skipEmptyOptionalFields: true
    }
  );

  if (parent.value === props.spaceId) {
    errors.parent = 'Space cannot be a sub-space of itself';
  }

  if (childInput.value === props.spaceId) {
    errors.childInput = 'Space cannot be a sub-space of itself';
  }

  if (children.value.includes(childInput.value)) {
    errors.childInput = 'Space already configured as sub-space';
  }

  return errors;
});
const parentSpaceError = computed(() => {
  if (formErrors.value.parent) return formErrors.value.parent as string;

  if (parentSpaceValidationResult.value === null) return null;
  if (parentSpaceValidationResult.value.value !== parent.value) return null;
  if (parentSpaceValidationResult.value.valid) return null;

  return `Space ${parentSpaceValidationResult.value.value} not found`;
});

async function addChild() {
  try {
    isAddingChild.value = true;

    const space = await network.value.api.loadSpace(childInput.value);

    if (!space) {
      throw new Error('Space not found');
    }

    children.value.push(childInput.value);
    childInput.value = '';
  } catch (e) {
    addNotification('error', `Space ${childInput.value} not found`);
  } finally {
    isAddingChild.value = false;
  }
}

function deleteChild(i: number) {
  children.value = children.value.filter((_, index) => index !== i);
}

watchDebounced(
  parent,
  async parent => {
    if (!parent) {
      parentSpaceValidationResult.value = {
        value: '',
        valid: true
      };
      return;
    }

    const space = await network.value.api.loadSpace(parent);

    parentSpaceValidationResult.value = {
      value: parent,
      valid: !!space
    };
  },
  { debounce: 500, immediate: true }
);

watchEffect(() => {
  const valid =
    Object.keys(formErrors.value).length === 0 &&
    parentSpaceValidationResult.value?.valid &&
    parentSpaceValidationResult.value?.value === parent.value;

  emit('updateValidity', !!valid);
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Sub-spaces</h4>
  <UiMessage
    type="info"
    :learn-more-link="'https://docs.snapshot.org/user-guides/spaces/sub-spaces'"
  >
    Add a sub-space to display its proposals within your space. If you want the
    current space to be displayed on the sub-space's page, the space need to be
    added as main space in the subs-space settings to make relation mutual.
  </UiMessage>
  <div class="s-box my-3">
    <UiInputString
      v-model="parent"
      :disabled="!canAddParentSpace"
      :class="{
        'cursor-not-allowed': !canAddParentSpace
      }"
      :definition="PARENT_SPACE_DEFINITION"
      :error="parentSpaceError ?? undefined"
    />
    <UiInputString
      v-model="childInput"
      :disabled="!canAddChildSpace"
      :class="{
        'cursor-not-allowed': !canAddChildSpace
      }"
      :definition="SUB_SPACE_DEFINITION"
      :error="formErrors.childInput"
    />
    <UiButton
      v-if="children.length < CHILDREN_LIMIT"
      :disabled="!canAddChildSpace || !!formErrors.childInput"
      :loading="isAddingChild"
      class="w-full"
      @click="addChild"
    >
      Add space
    </UiButton>
  </div>
  <div class="flex flex-wrap gap-2">
    <div
      v-for="(child, i) in children"
      :key="child"
      class="flex items-center gap-2 rounded-lg border px-3 py-2 w-fit"
    >
      <span>{{ child }}</span>
      <button type="button" @click="deleteChild(i)">
        <IH-x-mark class="w-[16px]" />
      </button>
    </div>
  </div>
  <h4 class="eyebrow mb-2 font-medium mt-4">Terms of services</h4>
  <div class="s-box">
    <UiInputString
      v-model="termsOfServices"
      :definition="TERMS_OF_SERVICES_DEFINITION"
      :error="formErrors.termsOfServices"
    />
  </div>
  <h4 class="eyebrow mb-2 font-medium mt-4">Custom domain</h4>
  <UiMessage
    type="info"
    :learn-more-link="'https://docs.snapshot.org/spaces/add-custom-domain'"
  >
    To setup a custom domain you additionally need to open a pull request on
    github after you have created the space.
  </UiMessage>
  <div class="s-box mt-3">
    <UiInputString
      v-model="customDomain"
      :definition="CUSTOM_DOMAIN_DEFINITION"
      :error="formErrors.customDomain"
    />
    <UiSwitch v-model="isPrivate" title="Hide space from homepage" />
  </div>
  <h4 class="eyebrow mb-2 font-medium mt-4">Danger zone</h4>
  <div
    class="flex flex-col md:flex-row gap-3 md:gap-1 items-center border rounded-md px-4 py-3"
  >
    <div class="flex flex-col">
      <h4 class="text-base">Delete space</h4>
      <span class="leading-5">
        Delete this space and all its content. This cannot be undone and you
        will not be able to create a new space with the same ENS domain name.
      </span>
    </div>
    <UiButton
      :disabled="!isController"
      class="w-full md:w-auto flex-shrink-0"
      :class="{
        'border-skin-danger !text-skin-danger': isController
      }"
      @click="isDeleteSpaceModalOpen = true"
    >
      Delete space
    </UiButton>
  </div>
  <teleport to="#modal">
    <ModalDeleteSpace
      :open="isDeleteSpaceModalOpen"
      :space-id="spaceId"
      @confirm="emit('deleteSpace')"
      @close="isDeleteSpaceModalOpen = false"
    />
  </teleport>
</template>
