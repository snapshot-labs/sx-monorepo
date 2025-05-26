<script setup lang="ts">
import { useTopicsQuery } from '@/queries/townhall';
import { Space } from '@/types';
import ModalCategoryConfig from '@/components/Modal/CategoryConfig.vue';
import { useTownhall } from '@/composables/useTownhall';
import { useUiStore } from '@/stores/ui';
const { sendAddCategory } = useTownhall();
const { addNotification } = useUiStore();

const modalOpen = ref(false);

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const {
  data: topics,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useTopicsQuery({
  spaceId: toRef(() => props.space.id)
});

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

async function handleAddCategory(data: { name: string; description: string }) {
  modalOpen.value = false;
  try {
    await sendAddCategory(0, data.name, data.description);
  } catch (e) {
    addNotification('error', (e as Error).message);
  }
}

watchEffect(() => setTitle(`Topics - ${props.space.name}`));
</script>

<template>
  <div>
    <div class="flex justify-end items-center gap-2 p-4">
      <UiDropdown>
        <template #button>
          <UiButton class="!p-0 !border-0 !h-auto">
            <IH-dots-vertical class="text-skin-text inline-block size-[22px]" />
          </UiButton>
        </template>
        <template #items>
          <UiDropdownItem v-slot="{ active }">
            <button
              type="button"
              class="flex items-center gap-2"
              :class="{ 'opacity-80': active }"
              @click="modalOpen = true"
            >
              <IH-plus :width="16" />
              Add a category
            </button>
          </UiDropdownItem>
        </template>
      </UiDropdown>
      <router-link
        :to="{
          name: 'space-townhall-create',
          params: { space: `${space.network}:${space.id}` }
        }"
      >
        <UiButton primary>New topic</UiButton>
      </router-link>
    </div>
    <div>
      <UiLabel label="Topics" sticky />
      <TownhallTopicsList
        limit="off"
        :is-error="isError"
        :is-loading="isPending"
        :is-loading-more="isFetchingNextPage"
        :topics="topics?.pages.flat() ?? []"
        @end-reached="handleEndReached"
      />
    </div>
    <teleport to="#modal">
      <ModalCategoryConfig
        :open="modalOpen"
        @add="handleAddCategory"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
