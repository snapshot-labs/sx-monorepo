<script setup lang="ts">
import { getNetwork } from '@/networks';
import { StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'addStrategy', strategy: StrategyTemplate);
  (e: 'close');
}>();

const searchValue = ref('');
const isLoading = ref(false);
const hasError = ref(false);
const strategies = ref([] as StrategyTemplate[]);

const network = computed(() => getNetwork(props.networkId));
const filteredStrategies = computed(() => {
  return strategies.value.filter(strategy => {
    if (!searchValue.value) return true;

    return strategy.name
      .toLowerCase()
      .includes(searchValue.value.toLowerCase());
  });
});

async function handleStrategySelected(strategy: StrategyTemplate) {
  emit('addStrategy', strategy);
  emit('close');
}

watchEffect(async () => {
  if (!props.open) return;

  isLoading.value = true;
  hasError.value = false;

  try {
    strategies.value = await network.value.api.loadStrategies();
  } catch (e) {
    console.log('failed to load strategies', e);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
});

watch(
  () => props.open,
  () => {
    searchValue.value = '';
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Add strategy</h3>
      <div
        v-if="!isLoading"
        class="flex items-center border-t px-2 py-3 mt-3 -mb-3"
      >
        <IH-search class="mx-2" />
        <input
          ref="searchInput"
          v-model="searchValue"
          type="text"
          placeholder="Search"
          class="flex-auto bg-transparent text-skin-link"
        />
      </div>
    </template>
    <div class="p-4 flex">
      <UiLoading v-if="isLoading" class="m-auto" />
      <div
        v-else-if="hasError"
        class="flex w-full justify-center items-center gap-2 text-skin-text"
      >
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span>Failed to load strategies.</span>
      </div>
      <div v-else class="flex flex-col flex-1 gap-3 overflow-hidden">
        <button
          v-for="strategy in filteredStrategies"
          :key="strategy.address"
          type="button"
          class="flex flex-col gap-2 p-[20px] border rounded-md"
          @click="handleStrategySelected(strategy)"
        >
          <div class="flex items-center gap-1">
            <span class="text-skin-link font-semibold leading-5 truncate">
              {{ strategy.name }}
            </span>
            <span v-if="strategy.version" class="leading-[18px]">
              {{ strategy.version }}
            </span>
          </div>
          <div v-if="strategy.author" class="flex items-center gap-1">
            <IC-github class="shrink-0" />
            <span class="leading-[18px] truncate">{{ strategy.author }}</span>
          </div>
          <div v-if="strategy.spaceCount !== undefined" class="leading-[18px]">
            In {{ strategy.spaceCount }} space(s)
          </div>
        </button>
      </div>
    </div>
  </UiModal>
</template>
