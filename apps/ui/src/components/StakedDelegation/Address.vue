<script setup lang="ts">
import {
  getStakedDelegationConfig,
  getValidator
} from '@/helpers/stakedVoteDelegation';
import { getNames } from '@/helpers/stamp';
import { shortenAddress } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    address: string;
    size?: number;
    label?: string;
    subtitle?: string;
    /** Link the name to the block explorer. Off inside clickable rows. */
    linked?: boolean;
    /** Name only, no second line. */
    compact?: boolean;
  }>(),
  { size: 32, linked: true }
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

const validatorName = computed(() => getValidator(props.address)?.name);

const displayName = computed(
  () =>
    props.label ||
    validatorName.value ||
    name.value ||
    shortenAddress(props.address)
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
          v-if="linked"
          :to="explorerLink"
          class="text-skin-link truncate hover:underline"
          :title="address"
        >
          {{ displayName }}
        </AppLink>
        <span v-else class="text-skin-link truncate" :title="address">
          {{ displayName }}
        </span>
        <slot name="badge" />
      </div>
      <div v-if="$slots.subtitle" class="mt-0.5">
        <slot name="subtitle" />
      </div>
      <div
        v-else-if="!compact && (subtitle || label || validatorName || name)"
        class="text-[15px] text-skin-text truncate"
        v-text="subtitle || shortenAddress(address)"
      />
    </div>
  </div>
</template>
