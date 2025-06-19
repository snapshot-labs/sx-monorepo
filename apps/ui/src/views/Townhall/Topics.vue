<script setup lang="ts">
import { Space as TownhallSpace } from '@/helpers/townhall/types';
import {
  useCategoriesQuery,
  useDeleteCategoryMutation,
  useTopicsQuery
} from '@/queries/townhall';
import { Space } from '@/types';

const props = defineProps<{ space: Space; townhallSpace: TownhallSpace }>();

const { setTitle } = useTitle();
const route = useRoute();

const spaceId = computed(() => props.townhallSpace.space_id);
const categoryId = computed(() => {
  const category = route.query.category;

  if (typeof category === 'string') {
    const parsed = Number(category);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
});

const { data: categories } = useCategoriesQuery({
  spaceId,
  categoryId
});
const { mutate: deleteCategory } = useDeleteCategoryMutation({
  spaceId,
  categoryId
});

const {
  data: topics,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useTopicsQuery({
  spaceId: toRef(() => props.townhallSpace.space_id)
});

const addCategoryModalOpen = ref(false);
const activeCategoryId = ref<string | null>(null);

function setAddCategoryModalStatus(
  open: boolean = false,
  categoryId: string | null = null
) {
  addCategoryModalOpen.value = open;
  activeCategoryId.value = categoryId;
}

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`Topics - ${props.space.name}`));
</script>

<template>
  <div>
    <div class="flex justify-end p-4 gap-2">
      <UiTooltip title="New topic">
        <UiButton
          :to="{
            name: 'space-townhall-create',
            params: { space: `${space.network}:${space.id}` }
          }"
          class="!px-0 w-[46px]"
        >
          <IH-pencil-alt />
        </UiButton>
      </UiTooltip>
      <UiDropdown>
        <template #button>
          <UiButton class="!px-0 w-[46px]">
            <IH-dots-horizontal class="inline-block" />
          </UiButton>
        </template>
        <template #items>
          <UiDropdownItem v-slot="{ active }">
            <AppLink
              class="flex items-center gap-2"
              :class="{ 'opacity-80': active }"
              :to="{ name: 'space-townhall-roles' }"
            >
              <IS-users :width="16" />
              Roles
            </AppLink>
          </UiDropdownItem>
          <UiDropdownItem v-slot="{ active }">
            <button
              type="button"
              class="flex items-center gap-2"
              :class="{ 'opacity-80': active }"
              @click="setAddCategoryModalStatus(true)"
            >
              <IH-plus :width="16" /> Create category
            </button>
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
    <div>
      <UiLabel label="Categories" sticky />
      <router-link
        v-for="(c, i) in categories"
        :key="i"
        :to="{
          name: 'space-townhall-topics',
          query: { category: c.category_id }
        }"
        class="flex justify-between items-center mx-4 py-3 border-b"
      >
        <div>
          <div
            class="w-[48px] h-[48px] bg-skin-border rounded-lg items-center justify-center flex mr-3"
          >
            <IH-folder class="inline-block" />
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-skin-link" v-text="c.name" />
          <div class="text-skin-text space-x-2">
            {{ c.description }}
          </div>
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
                @click="setAddCategoryModalStatus(true, c.id)"
              >
                <IH-pencil :width="16" />
                Edit category
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <button
                type="button"
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
                @click="() => deleteCategory({ id: c.category_id })"
              >
                <IH-trash :width="16" />
                Delete category
              </button>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </router-link>
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
      <ModalAddCategory
        :space-id="spaceId"
        :category-id="categoryId"
        :open="addCategoryModalOpen"
        :initial-state="(categories || []).find(l => l.id === activeCategoryId)"
        @close="setAddCategoryModalStatus(false)"
      />
    </teleport>
  </div>
</template>
