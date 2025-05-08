<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { Role } from '@/helpers/townhall/types';
import {
  useRoleMutation,
  useRolesQuery,
  useUserRolesQuery
} from '@/queries/townhall';
import { SpaceMetadataLabel } from '@/types';

const { setTitle } = useTitle();
const { sendCreateRole, sendEditRole, sendDeleteRole } = useTownhall();
const { addNotification } = useUiStore();
const { web3 } = useWeb3();
const queryClient = useQueryClient();

const modalOpen = ref(false);
const activeLabelId = ref<string | null>(null);
const spaceId = ref('1');
const userSpaceRoles = computed(() => {
  return userRoles.value?.filter(role => role.space.id === spaceId.value) ?? [];
});

const { data: roles, isPending, isError } = useRolesQuery(spaceId);
const { data: userRoles } = useUserRolesQuery(toRef(() => web3.value.account));
const { isPending: isMutatingRole, variables, mutate } = useRoleMutation();

function getIsRoleClaimed(roleId: string) {
  return userSpaceRoles.value.some(role => role.id === roleId);
}

function setModalStatus(open: boolean = false, roleId: string | null = null) {
  modalOpen.value = open;
  activeLabelId.value = roleId;
}

async function handleAddRole(config: SpaceMetadataLabel) {
  modalOpen.value = false;

  try {
    const res = await sendCreateRole(
      spaceId.value,
      config.name,
      config.description,
      config.color
    );
    if (!res) return;

    const newRoles: Role[] = res.result.events
      .filter(event => event.key === 'new_role')
      .map(event => ({
        space: event.data[0],
        id: event.data[1],
        name: event.data[2],
        description: event.data[3],
        color: event.data[4]
      }));

    queryClient.setQueryData<Role[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) => {
        return [...old, ...newRoles];
      }
    );
  } catch (e) {
    addNotification('error', e.message);
  }
}

async function handleEditRole(config: SpaceMetadataLabel) {
  if (!activeLabelId.value) {
    return;
  }

  modalOpen.value = false;

  try {
    const res = await sendEditRole(
      spaceId.value,
      activeLabelId.value,
      config.name,
      config.description,
      config.color
    );
    if (!res) return;

    queryClient.setQueryData<Role[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) =>
        old.map(role =>
          role.id === activeLabelId.value
            ? {
                space: { id: spaceId.value },
                id: activeLabelId.value,
                name: config.name,
                description: config.description,
                color: config.color
              }
            : role
        )
    );
  } catch (e) {
    addNotification('error', e.message);
  }
}

async function handleDeleteRole(id: string) {
  try {
    const res = await sendDeleteRole(spaceId.value, id);
    if (!res) return;

    queryClient.setQueryData<Role[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) => old.filter(role => role.id !== id)
    );
  } catch (e) {
    addNotification('error', e.message);
  }
}

setTitle('Roles');
</script>

<template>
  <div>
    <div class="flex justify-end p-4">
      <UiButton primary @click="modalOpen = true">Add role</UiButton>
    </div>
    <div>
      <UiLabel label="Roles" sticky />
      <div>
        <div v-if="isPending" class="my-3 mx-4">
          <UiLoading />
        </div>
        <div v-else>
          <div
            v-if="isError"
            class="px-4 py-3 flex items-center text-skin-link gap-2"
          >
            <IH-exclamation-circle />
            <span v-text="'Failed to load roles.'" />
          </div>
          <div
            v-if="roles?.length === 0"
            class="px-4 py-3 flex items-center text-skin-link gap-2"
          >
            <IH-exclamation-circle />
            <span v-text="'There are no roles here.'" />
          </div>
          <div
            v-for="role in roles"
            :key="role.id"
            class="py-2.5 mx-4 block border-b"
          >
            <div
              class="flex flex-nowrap items-center justify-between gap-x-3 gap-y-1 truncate"
            >
              <div
                class="md:min-w-max min-w-0 flex-shrink-0 items-center flex space-x-2"
              >
                <div
                  class="size-[10px] rounded-full"
                  :style="{ background: role.color }"
                />
                <h4 v-text="role.name" />
              </div>
              <div
                v-if="role.description"
                class="w-full truncate"
                v-text="role.description"
              />
              <div class="flex items-center gap-3">
                <div class="flex gap-3 items-center">
                  <UiButton
                    :loading="variables?.role.id === role.id && isMutatingRole"
                    :class="{
                      'hover:border-skin-danger hover:!text-skin-danger':
                        getIsRoleClaimed(role.id)
                    }"
                    @click="
                      mutate({
                        role,
                        isRevoking: getIsRoleClaimed(role.id)
                      })
                    "
                  >
                    {{ getIsRoleClaimed(role.id) ? 'Revoke' : 'Claim' }}
                  </UiButton>
                </div>
                <UiDropdown class="flex gap-3 items-center h-[24px]">
                  <template #button>
                    <UiButton class="!p-0 !border-0 !h-auto">
                      <IH-dots-vertical
                        class="text-skin-text inline-block size-[22px]"
                      />
                    </UiButton>
                  </template>
                  <template #items>
                    <UiDropdownItem v-slot="{ active }">
                      <button
                        type="button"
                        class="flex items-center gap-2"
                        :class="{ 'opacity-80': active }"
                        @click="() => setModalStatus(true, role.id)"
                      >
                        <IH-pencil :width="16" />
                        Edit role
                      </button>
                    </UiDropdownItem>
                    <UiDropdownItem v-slot="{ active }">
                      <button
                        type="button"
                        class="flex items-center gap-2"
                        :class="{ 'opacity-80': active }"
                        @click="() => handleDeleteRole(role.id)"
                      >
                        <IH-trash :width="16" />
                        Delete role
                      </button>
                    </UiDropdownItem>
                  </template>
                </UiDropdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <teleport to="#modal">
      <ModalLabelConfig
        item-type="role"
        :open="modalOpen"
        :initial-state="(roles || []).find(l => l.id === activeLabelId)"
        @add="
          config => {
            activeLabelId ? handleEditRole(config) : handleAddRole(config);
          }
        "
        @close="setModalStatus(false)"
      />
    </teleport>
  </div>
</template>
