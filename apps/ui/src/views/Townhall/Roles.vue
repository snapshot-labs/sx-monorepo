<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import {
  Role,
  RoleConfig,
  Space as TownhallSpace
} from '@/helpers/townhall/types';
import { compareAddresses, getUserFacingErrorMessage } from '@/helpers/utils';
import {
  useRoleMutation,
  useRolesQuery,
  useUserRolesQuery
} from '@/queries/townhall';
import { Space } from '@/types';

const props = defineProps<{ space: Space; townhallSpace: TownhallSpace }>();

const { setTitle } = useTitle();
const { sendCreateRole, sendEditRole, sendDeleteRole } = useTownhall();
const { addNotification } = useUiStore();
const { web3 } = useWeb3();
const queryClient = useQueryClient();

const modalOpen = ref(false);
const activeLabelId = ref<string | null>(null);
const isSubmitLoading = ref(false);
const spaceId = computed(() => props.townhallSpace.space_id);

const { data: roles, isPending, isError } = useRolesQuery(spaceId);
const { data: userRoles } = useUserRolesQuery({
  spaceId,
  user: toRef(() => web3.value.account)
});
const {
  isPending: isMutatingRole,
  variables,
  mutate
} = useRoleMutation({ spaceId });

const isUserAdmin = computed(() => {
  if (compareAddresses(props.townhallSpace.owner, web3.value.account)) {
    return true;
  }

  return (userRoles.value ?? []).some(role => role.isAdmin);
});

function getIsRoleClaimed(roleId: string) {
  return (userRoles.value ?? []).some(role => role.id === roleId);
}

function setModalStatus(open: boolean = false, roleId: string | null = null) {
  modalOpen.value = open;
  activeLabelId.value = roleId;
}

async function handleAddRole(config: RoleConfig) {
  try {
    isSubmitLoading.value = true;
    const res = await sendCreateRole(
      spaceId.value,
      config.name,
      config.description,
      config.color,
      config.isAdmin
    );
    if (!res) return;

    const newRoles: Role[] = res.result.events
      .filter(event => event.key === 'new_role')
      .map(event => ({
        space: { id: event.data[0].toString(), space_id: event.data[0] },
        id: event.data[1],
        name: config.name,
        description: config.description,
        color: config.color,
        isAdmin: config.isAdmin
      }));

    queryClient.setQueryData<Role[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) => {
        return [...old, ...newRoles];
      }
    );
    modalOpen.value = false;
  } catch (e) {
    addNotification('error', getUserFacingErrorMessage(e));
  } finally {
    isSubmitLoading.value = false;
  }
}

async function handleEditRole(config: RoleConfig) {
  if (!activeLabelId.value) {
    return;
  }

  try {
    isSubmitLoading.value = true;
    const res = await sendEditRole(
      spaceId.value,
      activeLabelId.value,
      config.name,
      config.description,
      config.color,
      config.isAdmin
    );
    if (!res) return;

    queryClient.setQueryData<Role[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) =>
        old.map(role =>
          role.id === activeLabelId.value
            ? {
                ...role,
                name: config.name,
                description: config.description,
                color: config.color,
                isAdmin: config.isAdmin
              }
            : role
        )
    );

    queryClient.setQueryData<Role[]>(
      ['townhall', 'userRoles', { spaceId, user: web3.value.account }, 'list'],
      (old = []) =>
        old.map(role =>
          role.id === activeLabelId.value
            ? {
                ...role,
                name: config.name,
                description: config.description,
                color: config.color,
                isAdmin: config.isAdmin
              }
            : role
        )
    );

    modalOpen.value = false;
  } catch (e) {
    addNotification('error', getUserFacingErrorMessage(e));
  } finally {
    isSubmitLoading.value = false;
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

    queryClient.setQueryData<Role[]>(
      ['townhall', 'userRoles', { spaceId, user: web3.value.account }, 'list'],
      old => {
        if (!old) return old;
        return old.filter(role => role.id !== id.toString());
      }
    );
  } catch (e) {
    addNotification('error', getUserFacingErrorMessage(e));
  }
}

watchEffect(() => setTitle(`Roles - ${props.space.name}`));
</script>

<template>
  <div>
    <div class="flex justify-end p-4">
      <UiButton v-if="isUserAdmin" primary @click="modalOpen = true">
        Add role
      </UiButton>
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
                <UiDropdown
                  v-if="isUserAdmin"
                  class="flex gap-3 items-center h-[24px]"
                >
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
      <ModalRoleConfig
        :open="modalOpen"
        :loading="isSubmitLoading"
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
