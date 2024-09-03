<script setup lang="ts">
import {
  loadReplies,
  loadSingleTopic,
  Reply,
  SPACES_DISCUSSIONS,
  Topic
} from '@/helpers/discourse';
import { sanitizeUrl } from '@/helpers/utils';
import router from '@/router';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const topic: Ref<Topic | null> = ref(null);
const replies: Ref<Reply[]> = ref([]);
const loading = ref(false);
const loaded = ref(false);
const failed = ref(false);

const route = useRoute();
const { setTitle } = useTitle();

const topicId = computed(() => route.params.topic as string);

const discussionsUrl = computed(() => {
  return SPACES_DISCUSSIONS[
    `${props.space.network}:${props.space.id}`
  ]?.replace(
    /\/c\/[^\/]+\/\d+$/,
    `/t/placeholder/${router.currentRoute.value.params.topic}`
  );
});

const replyUrl = computed(() =>
  discussionsUrl.value?.replace('/t/placeholder/', '/t/')
);

const discussion = computed(() => sanitizeUrl(discussionsUrl.value));

async function loadTopic() {
  try {
    failed.value = false;
    loaded.value = false;
    loading.value = true;
    topic.value = await loadSingleTopic(discussionsUrl.value || '');
    replies.value = await loadReplies(discussion.value || '');
    loading.value = false;
  } catch (e) {
    console.error(e);
    failed.value = true;
  } finally {
    loaded.value = true;
    loading.value = false;
  }
}

watchEffect(() =>
  setTitle(`${topic.value?.title || 'Discussions'} - ${props.space.name}`)
);

watch(topicId, async (newId, oldId) => {
  if (newId == oldId) return;

  await loadTopic();
});

onMounted(async () => await loadTopic());
</script>

<template>
  <div class="px-4 py-3">
    <div v-if="loading">
      <UiLoading />
    </div>
    <div v-else-if="failed" class="flex items-center text-skin-link space-x-2">
      <IH-exclamation-circle class="shrink-0" />
      <span>Error while loading the topic.</span>
    </div>
    <div v-else-if="loaded">
      <h1 class="text-[40px] leading-[1.1em]">
        {{ topic?.title }}
      </h1>
      <div
        v-for="(reply, i) in replies"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <DiscussionTopicItem :reply="reply" :discussion="discussion" />
      </div>
      <div class="mt-6">
        <a :href="replyUrl" target="_blank" tabindex="-1">
          <UiButton class="flex items-center gap-2 w-full justify-center">
            <IC-discourse class="size-[22px] shrink-0" />
            Reply
            <IH-arrow-sm-right class="shrink-0 -rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
  </div>
</template>
