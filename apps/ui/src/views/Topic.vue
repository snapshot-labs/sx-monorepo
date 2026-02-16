<script setup lang="ts">
import {
  loadSingleTopic,
  Reply,
  SPACES_DISCUSSIONS,
  Topic
} from '@/helpers/discourse';
import turndownService from '@/helpers/turndownService';
import { sanitizeUrl } from '@/helpers/utils';
import { Proposal, Space } from '@/types';

const props = defineProps<{ proposal?: Proposal; space?: Space }>();

const { setTitle } = useTitle();
const route = useRoute();

const replies = ref<Reply[]>([]);
const topic = ref<Topic | null>(null);
const failed = ref(false);
const loading = ref(false);
const loaded = ref(false);

const topicId = computed(() => route.params.topic as string);

const discussion = computed(() => {
  if (props.proposal) return sanitizeUrl(props.proposal.discussion);
  if (props.space)
    return SPACES_DISCUSSIONS[
      `${props.space.network}:${props.space.id}`
    ]?.replace(/\/c\/[^\/]+\/\d+$/, `/t/${topicId.value}`);
  return '';
});

const toMarkdown = computed(() =>
  turndownService({ discussion: discussion.value || '' })
);

async function loadTopic(url: string) {
  try {
    failed.value = false;
    loaded.value = false;
    loading.value = true;
    topic.value = await loadSingleTopic(url);
    replies.value = topic.value.posts;
  } catch (e) {
    console.error(e);
    failed.value = true;
  } finally {
    loaded.value = true;
    loading.value = false;
  }
}

watchEffect(() => setTitle(`${topic.value?.title || 'Discussions'}`));
watch(discussion, async newDiscussion => {
  if (newDiscussion) await loadTopic(newDiscussion);
});

onMounted(async () => {
  if (discussion.value) await loadTopic(discussion.value);
});
</script>

<template>
  <div>
    <div v-if="discussion" class="bg-skin-bg border-b">
      <div class="max-w-[730px] mx-auto p-4">
        <UiButton :to="discussion" class="w-full">
          <IC-discourse class="size-[22px] shrink-0" />
          Join the discussion
        </UiButton>
      </div>
    </div>
    <div v-if="loading" class="text-center p-4">
      <UiLoading />
    </div>
    <UiStateWarning v-else-if="failed" class="p-4">
      Failed to load the topic.
    </UiStateWarning>
    <div v-if="loaded && !failed" class="pt-5 max-w-[730px] mx-auto px-4">
      <h1 class="text-[40px] leading-[1.1em]">
        {{ topic?.title }}
      </h1>
      <div
        v-for="(reply, i) in replies"
        :key="i"
        class="border-b last:border-b-0 py-4"
      >
        <div class="flex gap-2.5 items-center">
          <AppLink :to="reply.user_url" class="shrink-0 rounded-full">
            <img
              :src="reply.avatar_template"
              class="rounded-full inline-block bg-skin-border size-[32px]"
            />
          </AppLink>
          <div class="flex flex-col leading-4 gap-1">
            <AppLink :to="reply.user_url">{{ reply.name }}</AppLink>
            <TimeRelative v-slot="{ relativeTime }" :time="reply.created_at">
              <span class="text-skin-text text-sm" v-text="relativeTime" />
            </TimeRelative>
          </div>
        </div>
        <UiMarkdown
          class="text-md pt-3 pb-2"
          :body="toMarkdown(reply.cooked)"
        />
        <div class="text-sm space-x-2.5 flex mt-2">
          <div class="items-center flex gap-1">
            <IH-thumb-up /> {{ reply.like_count }}
          </div>
          <div class="items-center flex gap-1">
            <IH-annotation /> {{ reply.reply_count }}
          </div>
          <div class="items-center flex gap-1">
            <IH-eye /> {{ reply.reads }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="loaded && !failed && discussion" class="bg-skin-bg border-t">
      <div class="max-w-[730px] mx-auto p-4 pb-0">
        <UiButton :to="discussion" class="w-full">
          <IC-discourse class="size-[22px] shrink-0" />
          Reply
        </UiButton>
      </div>
    </div>
  </div>
</template>
