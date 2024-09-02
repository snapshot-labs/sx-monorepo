<script setup lang="ts">
import { loadTopics, SPACES_DISCUSSIONS, Topic } from '@/helpers/discourse';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const topics: Ref<Topic[]> = ref([]);
const loading = ref(false);

const discussionsUrl =
  SPACES_DISCUSSIONS[`${props.space.network}:${props.space.id}`];

onMounted(async () => {
  try {
    if (!discussionsUrl) return;

    loading.value = true;
    topics.value = await loadTopics(discussionsUrl);
    loading.value = false;
  } catch (e) {
    console.error(e);
  }
});

watchEffect(() => setTitle(`Discussions - ${props.space.name}`));
</script>

<template>
  <div>
    <div v-if="discussionsUrl" class="flex p-4">
      <div class="flex-grow">
        <a :href="discussionsUrl" target="_blank" class="inline-block">
          <UiButton class="flex items-center gap-2 justify-center">
            <IC-discourse class="size-[22px]" />
            Join the discussion
            <IH-arrow-sm-right class="-rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
    <TopicsList title="Topics" :loading="loading" :topics="topics" />
  </div>
</template>
