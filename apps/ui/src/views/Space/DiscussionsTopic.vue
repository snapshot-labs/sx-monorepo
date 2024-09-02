<script setup lang="ts">
import {
  loadReplies,
  loadSingleTopic,
  Reply,
  SPACES_DISCUSSIONS,
  Topic
} from '@/helpers/discourse';
import { _rt, sanitizeUrl, stripHtmlTags } from '@/helpers/utils';
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
    <div v-if="loaded" class="px-4 pl-6 pt-5">
      <h1 class="text-[40px] leading-[1.1em]">{{ topic?.title }}</h1>
      <div
        v-for="(reply, i) in replies"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <div class="max-w-[680px]">
          <div class="flex">
            <a
              :href="reply.user_url"
              target="_blank"
              class="w-[32px] h-[32px] shrink-0 mr-2.5 mt-0.5"
            >
              <img
                :src="reply.avatar_template"
                class="rounded-full inline-block bg-skin-border w-[32px] h-[32px]"
              />
            </a>
            <div class="flex flex-col leading-4 gap-1">
              <a :href="reply.user_url" target="_blank" v-text="reply.name" />
              <span
                class="text-skin-text text-sm"
                v-text="_rt(reply.created_at)"
              />
            </div>
          </div>
          <div>
            <UiMarkdown
              class="text-md pt-3 pb-2"
              :body="stripHtmlTags(reply.cooked)"
            />
            <div class="text-sm space-x-2.5 flex">
              <div class="items-center flex gap-1">
                <IH-thumb-up class="inline-block" /> {{ reply.like_count }}
              </div>
              <div class="items-center flex gap-1">
                <IH-annotation class="inline-block" /> {{ reply.reply_count }}
              </div>
              <div class="items-center flex gap-1">
                <IH-eye class="inline-block" /> {{ reply.reads }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6">
        <a :href="replyUrl" target="_blank">
          <UiButton class="flex items-center gap-2 w-full justify-center">
            <IC-discourse class="size-[22px]" />
            Reply
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
  </div>
</template>
