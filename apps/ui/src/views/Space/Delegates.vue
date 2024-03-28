<script setup lang="ts">
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const activeDelegationId = ref(0);
const delegateData = computed(() => props.space.delegations[activeDelegationId.value]);

watchEffect(() => setTitle(`Delegates - ${props.space.name}`));
</script>

<template>
  <div
    v-if="space.delegations.length !== 1"
    class="overflow-y-scroll no-scrollbar z-40 sticky top-[71px] lg:top-[72px]"
  >
    <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
      <a v-for="(delegation, i) in space.delegations" :key="i" @click="activeDelegationId = i">
        <UiLink
          :is-active="activeDelegationId === i"
          :text="delegation.name || `Delegates ${i + 1}`"
        />
      </a>
    </div>
  </div>
  <SpaceDelegates
    v-if="delegateData"
    :key="activeDelegationId"
    :space="space"
    :delegation="delegateData"
  />
</template>
