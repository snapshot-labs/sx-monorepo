<script setup lang="ts">
import { Space as TownhallSpace } from '@/helpers/townhall/types';
import { compareAddresses } from '@/helpers/utils';
import {
  useCategoriesQuery,
  useCategoryQuery,
  useDeleteCategoryMutation,
  useTopicsQuery,
  useUserRolesQuery
} from '@/queries/townhall';
import { Space } from '@/types';

const props = defineProps<{ space: Space; townhallSpace: TownhallSpace }>();

const { setTitle } = useTitle();
const route = useRoute();
const { web3 } = useWeb3();

const spaceId = computed(() => props.townhallSpace.space_id);
const categoryId = computed(() => {
  const category = route.params.category;

  return category ? Number(category) : null;
});

const { data: category } = useCategoryQuery({
  spaceId,
  categoryId
});
const { data: categories } = useCategoriesQuery({
  spaceId,
  categoryId
});
const { data: userRoles } = useUserRolesQuery({
  spaceId: spaceId,
  user: toRef(() => web3.value.account)
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
  spaceId,
  categoryId
});

const addCategoryModalOpen = ref(false);
const activeCategoryId = ref<string | null>(null);

const isUserAdmin = computed(() => {
  if (compareAddresses(props.townhallSpace.owner, web3.value.account)) {
    return true;
  }

  return (userRoles.value ?? []).some(role => role.isAdmin);
});

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
      <div class="flex-auto">
        <div v-if="category" class="flex items-center space-x-3">
          <router-link
            :to="
              category.parent_category
                ? {
                    name: 'space-townhall-category-topics',
                    params: {
                      category: category.parent_category_id,
                      category_slug: category.parent_category.slug
                    }
                  }
                : { name: 'space-townhall-topics' }
            "
          >
            <UiButton class="!px-0 w-[46px]">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h3 class="text-[21px]">{{ category.name }}</h3>
        </div>
      </div>
      <UiTooltip title="New topic">
        <UiButton
          :to="
            category
              ? {
                  name: 'space-townhall-category-create',
                  params: {
                    space: `${space.network}:${space.id}`,
                    category: category.category_id,
                    category_slug: category.slug
                  }
                }
              : {
                  name: 'space-townhall-create',
                  params: {
                    space: `${space.network}:${space.id}`
                  }
                }
          "
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
          <UiDropdownItem v-if="isUserAdmin" v-slot="{ active }">
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
    <div class="space-y-3">
      <div v-if="categories?.length">
        <UiLabel label="Categories" sticky />
        <router-link
          v-for="(c, i) in categories"
          :key="i"
          :to="{
            name: 'space-townhall-category-topics',
            params: { category: c.category_id, category_slug: c.slug }
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
            <h3 class="text-skin-link text-[21px]" v-text="c.name" />
            <div class="text-skin-text">{{ c.topic_count }} topic(s)</div>
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
