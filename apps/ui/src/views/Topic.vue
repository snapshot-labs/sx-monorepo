<script setup lang="ts">
import {
  loadSingleTopic,
  Reply,
  SPACES_DISCUSSIONS,
  Topic
} from '@/helpers/discourse';
import turndownService from '@/helpers/turndownService';
import { _rt, sanitizeUrl } from '@/helpers/utils';
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
      <div class="max-w-[710px] mx-auto p-4">
        <a :href="discussion" target="_blank" tabindex="-1">
          <UiButton class="flex items-center gap-2 w-full justify-center">
            <IC-discourse class="size-[22px] shrink-0" />
            Join the discussion
            <IH-arrow-sm-right class="-rotate-45 shrink-0" />
          </UiButton>
        </a>
      </div>
    </div>
    <div v-if="loading" class="text-center p-4">
      <UiLoading />
    </div>
    <div
      v-else-if="failed"
      class="flex items-center text-skin-link space-x-2 p-4"
    >
      <IH-exclamation-circle class="shrink-0" />
      <span>Error while loading the topic.</span>
    </div>
    <div v-if="loaded && !failed" class="pt-5 px-4">
      <h1 class="text-[40px] leading-[1.1em] max-w-[710px] mx-auto">
        {{ topic?.title }}
      </h1>
      <div
        v-for="(reply, i) in replies"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <div class="max-w-[710px] mx-auto">
          <div class="flex gap-2.5 items-center">
            <a
              :href="reply.user_url"
              target="_blank"
              class="shrink-0 rounded-full"
            >
              <img
                :src="reply.avatar_template"
                class="rounded-full inline-block bg-skin-border size-[32px]"
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
          <UiMarkdown
            class="text-md pt-3 pb-2"
            :body="toMarkdown(reply.cooked)"
          />
          <div class="text-sm space-x-2.5 flex">
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
    </div>
    <div v-if="loaded && !failed && discussion" class="bg-skin-bg border-t">
      <div class="max-w-[710px] mx-auto p-4">
        <a :href="discussion" target="_blank" tabindex="-1">
          <UiButton class="flex items-center gap-2 w-full justify-center">
            <IC-discourse class="size-[22px] shrink-0" />
            Reply
            <IH-arrow-sm-right class="-rotate-45 shrink-0" />
          </UiButton>
        </a>
      </div>
    </div>
  </div>
</template>
