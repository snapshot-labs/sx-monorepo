<script setup lang="ts">
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const activeDelegationId = ref(0);
const delegateData = computed(
  () => props.space.delegations[activeDelegationId.value]
);

watchEffect(() => setTitle(`Delegates - ${props.space.name}`));
</script>

<template>
  <div>
    <div
      v-if="space.delegations.length === 0"
      class="px-4 py-3 flex items-center text-skin-link space-x-2"
    >
      <IH-exclamation-circle class="inline-block" />
      <span>No delegations configured.</span>
    </div>
    <div v-else>
      <UiScrollerHorizontal
        v-if="space.delegations.length > 1"
        class="z-40 sticky top-[71px] lg:top-[72px]"
        with-buttons
        gradient="xxl"
      >
        <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
          <button
            v-for="(delegation, i) in space.delegations"
            :key="i"
            type="button"
            @click="activeDelegationId = i"
          >
            <UiLabel
              :is-active="activeDelegationId === i"
              :text="delegation.name || `Delegates ${i + 1}`"
            />
          </button>
        </div>
      </UiScrollerHorizontal>
      <SpaceDelegates
        v-if="delegateData"
        :key="activeDelegationId"
        :space="space"
        :delegation="delegateData"
      />
    </div>
  </div>
</template>
