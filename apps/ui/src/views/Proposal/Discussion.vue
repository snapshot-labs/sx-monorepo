<script setup lang="ts">
import { _rt, sanitizeUrl } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
}>();

const comments = ref([]);

const discussion = computed(() => {
  return sanitizeUrl(props.proposal.discussion);
});

const BASE_URL = new URL(props.proposal.discussion).origin;
const TOPIC_ID = new URL(props.proposal.discussion).pathname.split('/')[3];

function stripHtml(str) {
  let doc = new DOMParser().parseFromString(str, 'text/html');

  return doc.body.textContent || '';
}

async function fetchComments() {
  const res = await fetch(
    `https://corsproxy.io/?${encodeURIComponent(`${BASE_URL}/t/${TOPIC_ID}/posts.json`)}`
  );
  const data = await res.json();

  return data.post_stream.posts.map(post => {
    post.avatar_template = post.avatar_template.replace('{size}', '64');
    if (post.avatar_template.startsWith('/'))
      post.avatar_template = BASE_URL + post.avatar_template;

    post.name = post.display_username || post.name || post.username;
    post.like_count = post.actions_summary.find(a => a.id === 2)?.count || 0;
    post.created_at = Date.parse(post.created_at) / 1e3;

    return post;
  });
}

onMounted(async () => {
  try {
    comments.value = await fetchComments();
  } catch (error) {
    console.error(error);
  }
});
</script>

<template>
  <div class="max-w-[680px] mx-auto px-4 pt-6">
    <div v-if="discussion">
      <a :href="discussion" target="_blank" class="block mb-2">
        <UiLinkPreview :url="discussion" :show-default="true" />
      </a>
      <div>{{ discussion }}</div>
    </div>
    <div
      v-for="(comment, i) in comments"
      :key="i"
      class="py-4 border-b last:border-b-0"
    >
      <div class="flex">
        <a
          :href="`${BASE_URL}/u/${comment.username}`"
          target="_blank"
          class="w-[32px] h-[32px] shrink-0 mr-2.5 mt-0.5"
        >
          <img
            :src="comment.avatar_template"
            class="rounded-full inline-block bg-skin-border w-[32px] h-[32px]"
          />
        </a>
        <div class="flex flex-col leading-4 gap-1">
          <a
            :href="`${BASE_URL}/u/${comment.username}`"
            target="_blank"
            v-text="comment.name"
          />
          <span
            class="text-skin-text text-sm"
            v-text="_rt(comment.created_at)"
          />
        </div>
      </div>
      <div>
        <UiMarkdown class="text-md py-3" :body="stripHtml(comment.cooked)" />
        <div class="text-sm space-x-2.5 flex">
          <a class="items-center flex gap-1">
            <IH-thumb-up class="inline-block" /> {{ comment.like_count }}
          </a>
          <a class="items-center flex gap-1">
            <IH-annotation class="inline-block" /> {{ comment.reply_count }}
          </a>
          <a class="items-center flex gap-1">
            <IH-eye class="inline-block" /> {{ comment.reads }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
