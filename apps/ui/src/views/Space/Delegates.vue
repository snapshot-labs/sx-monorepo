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
    <UiStateWarning v-if="space.delegations.length === 0" class="px-4 py-3">
      No delegations configured.
    </UiStateWarning>
    <div v-else>
      <UiScrollerHorizontal
        v-if="space.delegations.length > 1"
        class="z-40 sticky top-header-height-with-offset lg:top-header-height"
        with-buttons
        gradient="xxl"
      >
        <UiTabs
          v-model="activeDelegationId"
          aria-label="Delegations"
          class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max"
        >
          <UiTab
            v-for="(delegation, i) in space.delegations"
            :key="i"
            v-slot="{ selected }"
            :value="i"
          >
            <UiLabel
              :is-active="selected"
              :text="delegation.name || `Delegates ${i + 1}`"
            />
          </UiTab>
        </UiTabs>
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
