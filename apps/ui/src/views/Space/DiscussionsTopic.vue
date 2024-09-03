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
const { setTitle } = useTitle();

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

watchEffect(() =>
  setTitle(`${topic.value?.title || 'Discussions'} - ${props.space.name}`)
);

onMounted(async () => {
  try {
    loading.value = true;
    topic.value = await loadSingleTopic(discussionsUrl.value || '');
    replies.value = await loadReplies(discussion.value || '');
    loading.value = false;
    loaded.value = true;
  } catch (e) {
    console.error(e);
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="p-4">
      <UiLoading />
    </div>
    <div v-if="loaded" class="px-4 pt-5">
      <h1 class="max-w-[680px] mx-auto text-[40px] leading-[1.x1em]">
        {{ topic?.title }}
      </h1>
      <div
        v-for="(reply, i) in replies"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <DiscussionTopicItem :reply="reply" class="max-w-[680px] mx-auto" />
      </div>
      <div class="mt-6 max-w-[680px] mx-auto">
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
