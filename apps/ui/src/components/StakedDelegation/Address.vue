<script setup lang="ts">
import {
  getStakedDelegationConfig,
  getValidator,
  getValidatorProfile
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

const { request: requestProfile, getProfile } = useSnapshotProfiles();
watch(() => props.address, requestProfile, { immediate: true });

const validatorName = computed(() => getValidator(props.address)?.name);
const snapshotName = computed(() => getProfile(props.address)?.name);
const profile = computed(() => getValidatorProfile(props.address));
const hasLogoError = ref(false);
watch(
  () => props.address,
  () => (hasLogoError.value = false)
);

const displayName = computed(
  () =>
    props.label ||
    validatorName.value ||
    snapshotName.value ||
    name.value ||
    shortenAddress(props.address)
);

const explorerLink = computed(
  () => `${getStakedDelegationConfig().explorerUrl}/contract/${props.address}`
);
</script>

<template>
  <div class="flex items-center gap-2.5 min-w-0">
    <img
      v-if="profile?.logo && !hasLogoError"
      :src="profile.logo"
      :alt="profile.name"
      :width="size"
      :height="size"
      class="rounded-full shrink-0 object-cover bg-skin-border"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @error="hasLogoError = true"
    />
    <UiStamp v-else :id="address" type="avatar" :size="size" class="shrink-0" />
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
        <UiTooltip
          v-if="profile?.verified"
          title="Profile verified by the Starknet Foundation"
        >
          <IS-badge-check class="size-[16px] text-skin-link shrink-0" />
        </UiTooltip>
        <slot name="badge" />
      </div>
      <div v-if="$slots.subtitle" class="mt-0.5">
        <slot name="subtitle" />
      </div>
      <div
        v-else-if="
          !compact &&
          (subtitle || label || validatorName || snapshotName || name)
        "
        class="text-[15px] text-skin-text truncate"
        v-text="subtitle || shortenAddress(address)"
      />
    </div>
  </div>
</template>
