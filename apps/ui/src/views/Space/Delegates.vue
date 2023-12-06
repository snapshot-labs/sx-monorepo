<script setup lang="ts">
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const activeDelegationId = ref(0);
const delegateData = computed(() => props.space.delegations[activeDelegationId.value]);

watchEffect(() => {
  setTitle(`Delegates - ${props.space.name}`);
});
</script>

<template>
  <div
    v-if="space.delegations.length !== 1"
    class="flex px-4 bg-skin-bg border-b sticky top-[71px] lg:top-[72px] z-40 space-x-3"
  >
    <a v-for="(delegation, i) in space.delegations" :key="i" @click="activeDelegationId = i">
      <Link :is-active="activeDelegationId === i" :text="delegation.name || 'Unnamed delegation'" />
    </a>
  </div>
  <BlockDelegates
    v-if="delegateData"
    :key="activeDelegationId"
    :space="space"
    :delegation="delegateData"
  />
</template>
