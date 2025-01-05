<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { NetworkID } from '@/types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    space: {
      id: string;
      avatar: string;
      network: NetworkID;
      active_proposals: number | null;
    };
    size: number;
    showActiveProposals?: boolean;
  }>(),
  {
    size: 22,
    showActiveProposals: false
  }
);

const cb = computed(() => getCacheHash(props.space.avatar));
</script>

<template>
  <div class="relative w-fit">
    <UiStamp
      v-bind="$attrs"
      :id="`${space.network}:${space.id}`"
      :size="size"
      :cb="cb"
      class="!bg-skin-bg"
      type="space"
    />
    <div
      v-if="showActiveProposals && space.active_proposals"
      class="h-[20px] min-w-[20px] absolute px-1 -bottom-2 -right-2 text-white bg-skin-success rounded-full flex items-center justify-center text-[12px] font-bold border-2 border-skin-bg"
    >
      {{ space.active_proposals }}
    </div>
  </div>
</template>
