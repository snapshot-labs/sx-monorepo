<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { getRoles } from '@/helpers/townhall/api';
import { SpaceMetadataLabel } from '@/types';

const { setTitle } = useTitle();
const route = useRoute();
const { sendCreateRole } = useTownhall();
const { addNotification } = useUiStore();
const queryClient = useQueryClient();

const modalOpen = ref(false);
const spaceId = computed(() => route.params.space as string);

const {
  data: roles,
  isPending,
  isError
} = useQuery({
  queryKey: ['townhall', 'roles', spaceId, 'list'],
  queryFn: () => {
    return getRoles(spaceId.value);
  }
});

async function handleAddRole(config: SpaceMetadataLabel) {
  modalOpen.value = false;

  try {
    await sendCreateRole(
      spaceId.value,
      config.id,
      config.name,
      config.description,
      config.color
    );

    queryClient.setQueryData<SpaceMetadataLabel[]>(
      ['townhall', 'roles', spaceId.value, 'list'],
      (old = []) => {
        return [...old, { ...config }];
      }
    );
  } catch (e) {
    addNotification('error', e.message);
  }
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
              class="flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-1 truncate"
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
            </div>
          </div>
        </div>
      </div>
      <UiButton
        class="w-full flex items-center justify-center gap-1 mt-4"
        @click="modalOpen = true"
      >
        <IH-plus class="shrink-0 size-[16px]" />
        Add role
      </UiButton>
    </UiContainer>
    <teleport to="#modal">
      <ModalLabelConfig
        :open="modalOpen"
        @add="handleAddRole"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
