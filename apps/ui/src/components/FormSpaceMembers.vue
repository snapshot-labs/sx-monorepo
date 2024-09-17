<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Member, NetworkID } from '@/types';

const model = defineModel<Member[]>({
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
}>();

const modalOpen = ref(false);

const network = computed(() => getNetwork(props.networkId));

function addMembers(members: Member[]) {
  model.value = [...model.value, ...members];
}

function getRoleName(role: Member['role']) {
  if (role === 'admin') return 'Admin';
  if (role === 'moderator') return 'Moderator';
  return 'Author';
}

function changeMemberRole(index: number, role: Member['role']) {
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
  <div class="flex flex-col gap-3">
    <div
      v-for="(member, i) in model"
      :key="member.address"
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
    >
      <div class="flex flex-col">
        <a
          :href="network.helpers.getExplorerUrl(member.address, 'address')"
          target="_blank"
          class="flex items-center text-skin-text leading-5"
        >
          <UiStamp
            :id="member.address"
            type="avatar"
            :size="18"
            class="mr-2 !rounded"
          />
          {{ shorten(member.address) }}
          <IH-arrow-sm-right class="-rotate-45" />
        </a>
      </div>
      <div class="flex gap-3">
        <UiDropdown>
          <template #button>
            <UiButton class="!p-0 border-0 !h-[auto] bg-transparent flex gap-2">
              {{ getRoleName(member.role) }}
              <IH-chevron-down class="text-skin-link" />
            </UiButton>
          </template>
          <template #items>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="flex items-center gap-2 lg:min-w-[200px]"
                :class="{ 'opacity-80': active }"
                @click="changeMemberRole(i, 'admin')"
              >
                Admin
                <UiTooltip
                  :title="'Able to modify the space settings, manage the space\'s proposals and create proposals'"
                >
                  <IH-question-mark-circle />
                </UiTooltip>
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="flex items-center gap-2 lg:min-w-[200px]"
                :class="{ 'opacity-80': active }"
                @click="changeMemberRole(i, 'moderator')"
              >
                Moderator
                <UiTooltip
                  :title="'Able to manage the space\'s proposals and create proposals'"
                >
                  <IH-question-mark-circle />
                </UiTooltip>
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="flex items-center gap-2 lg:min-w-[200px]"
                :class="{ 'opacity-80': active }"
                @click="changeMemberRole(i, 'author')"
              >
                Author
                <UiTooltip
                  :title="'Able to create proposals without having to go through proposal validation'"
                >
                  <IH-question-mark-circle />
                </UiTooltip>
              </button>
            </UiDropdownItem>
          </template>
        </UiDropdown>
        <button type="button" @click="deleteMember(i)">
          <IH-trash />
        </button>
      </div>
    </div>
    <UiButton class="w-full" @click="modalOpen = true">Add members</UiButton>
  </div>
  <teleport to="#modal">
    <ModalAddMembers
      :open="modalOpen"
      :current-members="model"
      @close="modalOpen = false"
      @add="addMembers"
    />
  </teleport>
</template>
