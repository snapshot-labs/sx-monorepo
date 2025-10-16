<script setup lang="ts">
import { makeConfigureOsnapUrl } from '@/helpers/osnap/getters';
import { Space, SpaceMetadataTreasury } from '@/types';

const props = defineProps<{
  open: boolean;
  space: Space;
  treasury: SpaceMetadataTreasury;
  isActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const configureUrl = computed(() => {
  const spaceUrl = window.location.href.replaceAll(/\/settings\/\w+/g, '');

  return makeConfigureOsnapUrl({
    spaceUrl,
    spaceName: props.space.name,
    safeAddress: props.treasury.address,
    network: props.treasury.chainId as number
  });
});
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Configure oSnap</h3>
    </template>
    <div class="p-4">
      oSnap seamlessly integrates with Snapshot and your treasury, automatically
      executing governance votes on-chain. Bypass the need for privileged
      signers to create a DAO that's more efficient and truly decentralized.
      <AppLink to="https://uma.xyz/osnap" class="flex items-center">
        Learn more
        <IH-arrow-sm-right class="-rotate-45" />
      </AppLink>
    </div>
    <template #footer>
      <UiButton primary :to="configureUrl" class="w-full">
        {{ isActive ? 'Deactivate oSnap' : 'Activate oSnap' }}
        <IH-arrow-sm-right class="-rotate-45" />
      </UiButton>
    </template>
  </UiModal>
</template>
