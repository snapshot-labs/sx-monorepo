<script setup lang="ts">
import { getStakedDelegationConfig } from '@/helpers/stakedVoteDelegation';
import { getNames } from '@/helpers/stamp';
import { shortenAddress } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    address: string;
    size?: number;
    label?: string;
    subtitle?: string;
  }>(),
  { size: 32 }
);

const name = ref('');

watch(
  () => props.address,
  async address => {
    name.value = '';
    if (!address) return;
    const names = await getNames([address]);
    name.value = names[address] || '';
  },
  { immediate: true }
);

const explorerLink = computed(
  () => `${getStakedDelegationConfig().explorerUrl}/contract/${props.address}`
);
</script>

<template>
  <div class="flex items-center gap-2.5 min-w-0">
    <UiStamp :id="address" type="avatar" :size="size" class="shrink-0" />
    <div class="min-w-0 leading-[22px]">
      <div class="flex items-center gap-1.5 min-w-0">
        <AppLink
          :to="explorerLink"
          class="text-skin-link truncate hover:underline"
          :title="address"
        >
          {{ label || name || shortenAddress(address) }}
        </AppLink>
        <slot name="badge" />
      </div>
      <div
        v-if="subtitle || label || name"
        class="text-[15px] text-skin-text truncate"
        v-text="subtitle || shortenAddress(address)"
      />
    </div>
  </div>
</template>
