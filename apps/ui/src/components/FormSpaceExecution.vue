<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getIsOsnapEnabled } from '@/helpers/osnap';
import { makeConfigureOsnapUrl } from '@/helpers/osnap/getters';
import { shorten } from '@/helpers/utils';
import { Space, SpaceMetadataTreasury } from '@/types';
import IHPencil from '~icons/heroicons-outline/pencil';

const enableOSnap = defineModel<boolean>('enableOSnap', { required: true });

const props = defineProps<{
  isOSnapPluginEnabled: boolean;
  space: Space;
  treasuries: SpaceMetadataTreasury[];
}>();

const {
  isPending,
  isError,
  data: oSnapAvailability
} = useQuery({
  queryKey: ['oSnapAvailability', props.treasuries],
  queryFn: async () => {
    return Promise.all(
      props.treasuries.map(async treasury => {
        if (!treasury.address || !treasury.chainId) {
          return 'UNSUPPORTED';
        }

        try {
          const isEnabled = await getIsOsnapEnabled(
            treasury.chainId as number,
            treasury.address
          );

          return isEnabled ? 'ENABLED' : 'DISABLED';
        } catch {
          return 'UNSUPPORTED';
        }
      })
    );
  }
});

function getConfigureUrl(treasury: SpaceMetadataTreasury) {
  console.log('treasury', treasury);
  const spaceUrl = window.location.href.replaceAll(/\/settings\/\w+/g, '');

  return makeConfigureOsnapUrl({
    spaceUrl,
    spaceName: props.space.name,
    safeAddress: treasury.address,
    network: treasury.chainId as number
  });
}
</script>

<template>
  <ButtonStrategy
    :is-active="enableOSnap"
    :strategy="{
      address: '',
      name: 'oSnap by UMA',
      about: `oSnap integrates with Snapshot and UMA's optimistic oracle to automatically execute transactions from governance proposals onchain for your Safe treasury.`,
      link: 'https://uma.xyz/osnap',
      icon: IHPencil,
      paramsDefinition: {}
    }"
    @click="enableOSnap = !enableOSnap"
  />
  <template v-if="isOSnapPluginEnabled && enableOSnap">
    <UiEyebrow class="font-medium mt-3 mb-2">Treasuries</UiEyebrow>
    <UiLoading v-if="isPending" />
    <UiStateWarning v-else-if="isError">
      Failed to load treasuries.
    </UiStateWarning>
    <div v-else>
      <div
        v-for="(treasury, i) in treasuries"
        :key="treasury.address"
        class="flex justify-between items-center first-of-type:rounded-t-lg last-of-type:rounded-b-lg first-of-type:border-t border-b border-x px-4 py-3 text-skin-link"
      >
        <div class="flex items-center">
          <UiBadgeNetwork
            :chain-id="treasury.chainId"
            class="mr-3 hidden sm:block"
          >
            <UiStamp
              :id="treasury.address"
              type="avatar"
              :size="32"
              class="rounded-md"
            />
          </UiBadgeNetwork>
          <div class="flex-1 leading-[22px]">
            <h4
              class="text-skin-link"
              v-text="treasury.name || shorten(treasury.address)"
            />
            <UiAddress
              class="text-skin-text text-[17px]"
              :address="treasury.address"
            />
          </div>
        </div>
        <div class="flex gap-3">
          <div
            v-if="oSnapAvailability && oSnapAvailability[i] === 'UNSUPPORTED'"
            class="text-skin-border"
          >
            oSnap unavailable
          </div>
          <UiButton
            v-else-if="oSnapAvailability && oSnapAvailability[i] === 'ENABLED'"
            :to="getConfigureUrl(treasury)"
            class="group hover:border-skin-danger hover:text-skin-danger"
          >
            <div
              class="flex items-center justify-center gap-2 group-hover:hidden"
            >
              <span class="block size-2 rounded-full bg-skin-success" />
              Active
            </div>
            <div class="items-center justify-center hidden group-hover:flex">
              Disable
              <IH-arrow-sm-right class="-rotate-45 -mr-2" />
            </div>
          </UiButton>
          <UiButton
            v-else-if="oSnapAvailability && oSnapAvailability[i] === 'DISABLED'"
            :to="getConfigureUrl(treasury)"
          >
            Enable
            <IH-arrow-sm-right class="-rotate-45 -mr-2" />
          </UiButton>
        </div>
      </div>
    </div>
  </template>
</template>
