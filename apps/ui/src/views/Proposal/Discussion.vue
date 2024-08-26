<script setup lang="ts">
import { loadReplies, Reply } from '@/helpers/discourse';
import { _rt, sanitizeUrl, stripHtml } from '@/helpers/utils';
import { Proposal } from '@/types';
import ICDiscourse from '~icons/c/discourse';

const props = defineProps<{ proposal: Proposal }>();

const replies: Ref<Reply[]> = ref([]);

const discussion = computed(() => sanitizeUrl(props.proposal.discussion));

onMounted(async () => {
  try {
    replies.value = await loadReplies(discussion.value || '');
  } catch (error) {
    console.error(error);
  }
});
</script>

<template>
  <div>
    <div v-if="discussion" class="p-4 bg-skin-bg border-b">
      <div class="max-w-[680px] mx-auto">
        <a :href="discussion" target="_blank">
          <UiButton class="flex items-center gap-2 w-full justify-center">
            <component :is="ICDiscourse" class="size-[22px]" />
            Join discussion
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
    <div class="px-4">
      <div
        v-for="(reply, i) in replies.slice(1)"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <div class="max-w-[680px] mx-auto">
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
              :body="stripHtml(reply.cooked)"
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
    </div>
  </div>
</template>
