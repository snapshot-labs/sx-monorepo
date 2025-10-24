<script setup lang="ts">
import { isAddress } from '@ethersproject/address';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { getNetwork } from '@/networks';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { Member, NetworkID } from '@/types';

const model = defineModel<Member[]>({
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
  isController: boolean;
  isAdmin: boolean;
}>();

const modalOpen = ref(false);

const network = computed(() => getNetwork(props.networkId));
const isAbleToChangeAdmins = computed(() => props.isController);
const starknetChainId = computed(() => {
  return Object.values(STARKNET_NETWORK_METADATA).find(
    snNetwork => snNetwork.baseChainId === network.value.baseChainId
  )?.chainId;
});

function addMembers(members: Member[]) {
  model.value = [...model.value, ...members];
}

function getRoleName(role: Member['role']) {
  if (role === 'admin') return 'Admin';
  if (role === 'moderator') return 'Moderator';
  return 'Author';
}

function changeMemberRole(index: number, role: Member['role']) {
  if (role === 'admin' && !isAbleToChangeAdmins.value) return;

  const newValue = [...model.value];
  newValue[index] = { ...newValue[index], role };
  model.value = newValue;
}

function deleteMember(index: number) {
  model.value = [
    ...model.value.slice(0, index),
    ...model.value.slice(index + 1)
  ];
}
</script>

<template>
  <UiCol :gap="12">
    <UiRow
      v-for="(member, i) in model"
      :key="member.address"
      justify="between"
      align="center"
      class="rounded-lg border px-4 py-3 text-skin-link"
    >
      <UiCol>
        <a
          :href="
            getGenericExplorerUrl(
              !isAddress(member.address) && starknetChainId
                ? starknetChainId
                : network.chainId,
              member.address,
              'address'
            ) || ''
          "
          target="_blank"
          class="text-skin-text leading-5 group"
        >
          <UiRow :gap="8" align="center">
            <UiStamp
              :id="member.address"
              type="avatar"
              :size="18"
              class="!rounded"
            />
            <UiAddress :address="member.address" />
            <IH-arrow-sm-right class="-rotate-45" />
          </UiRow>
        </a>
      </UiCol>
      <UiRow :gap="12">
        <UiDropdown
          :disabled="member.role === 'admin' && !isAbleToChangeAdmins"
        >
          <template #button>
            <button
              type="button"
              :class="{
                'opacity-40 !cursor-not-allowed':
                  member.role === 'admin' && !isAbleToChangeAdmins
              }"
            >
              <UiRow :gap="8" align="center">
                {{ getRoleName(member.role) }}
                <IH-chevron-down class="text-skin-link" />
              </UiRow>
            </button>
          </template>
          <template #items>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="lg:min-w-[200px]"
                :disabled="!isAbleToChangeAdmins"
                :class="{
                  'opacity-80': active && isAbleToChangeAdmins,
                  'opacity-40 cursor-not-allowed': !isAbleToChangeAdmins
                }"
                @click="changeMemberRole(i, 'admin')"
              >
                <UiRow :gap="8" align="center">
                  Admin
                  <UiTooltip
                    :title="'Able to modify the space settings, manage the space\'s proposals and create proposals'"
                  >
                    <IH-question-mark-circle />
                  </UiTooltip>
                </UiRow>
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="lg:min-w-[200px]"
                :class="{ 'opacity-80': active }"
                @click="changeMemberRole(i, 'moderator')"
              >
                <UiRow :gap="8" align="center">
                  Moderator
                  <UiTooltip
                    :title="'Able to manage the space\'s proposals and create proposals'"
                  >
                    <IH-question-mark-circle />
                  </UiTooltip>
                </UiRow>
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="lg:min-w-[200px]"
                :class="{ 'opacity-80': active }"
                @click="changeMemberRole(i, 'author')"
              >
                <UiRow :gap="8" align="center">
                  Author
                  <UiTooltip
                    :title="'Able to create proposals without having to go through proposal validation'"
                  >
                    <IH-question-mark-circle />
                  </UiTooltip>
                </UiRow>
              </button>
            </UiDropdownItem>
          </template>
        </UiDropdown>
        <button
          type="button"
          :disabled="member.role === 'admin' && !isAbleToChangeAdmins"
          :class="{
            'opacity-40 cursor-not-allowed':
              member.role === 'admin' && !isAbleToChangeAdmins
          }"
          @click="deleteMember(i)"
        >
          <IH-trash />
        </button>
      </UiRow>
    </UiRow>
    <UiButton class="w-full" @click="modalOpen = true">Add members</UiButton>
  </UiCol>
  <teleport to="#modal">
    <ModalAddMembers
      :open="modalOpen"
      :is-controller="isController"
      :current-members="model"
      @close="modalOpen = false"
      @add="addMembers"
    />
  </teleport>
</template>
