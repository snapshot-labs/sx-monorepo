<script setup lang="ts">
import {
  useRoleMutation,
  useRolesQuery,
  useUserRolesQuery
} from '@/queries/townhall';

const { setTitle } = useTitle();
const route = useRoute();
const { web3 } = useWeb3();

const spaceId = computed(() => route.params.space as string);
const userSpaceRoles = computed(() => {
  return userRoles.value?.filter(role => role.space === spaceId.value) ?? [];
});

const { data: roles, isPending, isError } = useRolesQuery(spaceId);
const { data: userRoles } = useUserRolesQuery(toRef(() => web3.value.account));
const {
  isPending: isMutatingRole,
  variables,
  mutate
} = useRoleMutation(toRef(() => web3.value.account));

function getIsRoleClaimed(roleId: string) {
  return userSpaceRoles.value.some(role => role.id === roleId);
}

setTitle('Ethereum Open Agora');
</script>

<template>
  <div>
    <UiContainer class="!max-w-[960px] py-4">
      <div class="eyebrow mb-2.5 text-skin-link">Roles</div>
      <div class="md:border-x border-y md:rounded-lg md:mx-0 -mx-4">
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
            class="py-3 mx-4 block border-b last:border-b-0"
          >
            <div
              class="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-1 truncate"
            >
              <div class="md:min-w-max min-w-0">
                <UiProposalLabel
                  :label="role.name || 'label preview'"
                  :color="role.color"
                  class="w-full"
                />
              </div>
              <div v-if="role.description" class="w-full">
                <div class="truncate" v-text="role.description" />
              </div>
              <div class="flex gap-3 items-center">
                <UiButton
                  :loading="variables?.role.id === role.id && isMutatingRole"
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
            </div>
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
