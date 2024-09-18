<script setup lang="ts">
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const CHILDREN_LIMIT = 16;

const PARENT_SPACE_DEFINITION = {
  type: 'string',
  title: 'Main space',
  minLength: 1,
  examples: ['pistachiodao.eth']
};

const SUB_SPACE_DEFINITION = {
  type: 'string',
  title: 'Sub-space(s)',
  minLength: 1,
  examples: ['pistachiodao.eth']
};

const parent = defineModel<string>('parent', { required: true });
const children = defineModel<string[]>('children', { required: true });

const props = defineProps<{
  networkId: NetworkID;
}>();

const { addNotification } = useUiStore();

const childInput = ref('');
const isAddingChild = ref(false);

const network = computed(() => getNetwork(props.networkId));
const canAddParentSpace = computed(() => children.value.length === 0);
const canAddChildSpace = computed(() => parent.value.length === 0);

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
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Sub-spaces</h4>
  <UiMessage
    :type="'info'"
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
    />
    <UiInputString
      v-model="childInput"
      :disabled="!canAddChildSpace"
      :class="{
        'cursor-not-allowed': !canAddChildSpace
      }"
      :definition="SUB_SPACE_DEFINITION"
    />
    <UiButton
      v-if="children.length < CHILDREN_LIMIT"
      :disabled="!canAddChildSpace"
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
</template>
