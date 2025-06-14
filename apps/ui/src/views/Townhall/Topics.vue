<script setup lang="ts">
import { useTopicsQuery } from '@/queries/townhall';
import { Space } from '@/types';

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

watchEffect(() => setTitle(`Topics - ${props.space.name}`));
</script>

<template>
  <div>
    <div class="flex justify-end p-4">
      <UiButton
        :to="{
          name: 'space-townhall-create',
          params: { space: `${space.network}:${space.id}` }
        }"
        primary
      >
        New topic
      </UiButton>
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
</template>
