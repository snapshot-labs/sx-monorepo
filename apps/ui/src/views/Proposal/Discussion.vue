<script setup lang="ts">
import { loadReplies, Reply } from '@/helpers/discourse';
import { _rt, sanitizeUrl, stripHtmlTags } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const replies: Ref<Reply[]> = ref([]);
const loading = ref(false);
const loaded = ref(false);

const discussion = computed(() => sanitizeUrl(props.proposal.discussion));

onMounted(async () => {
  try {
    loading.value = true;
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
    <div v-if="discussion" class="p-4 bg-skin-bg border-b">
      <div class="max-w-[680px] mx-auto">
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
    <div v-if="loaded" class="px-4">
      <div
        v-for="(reply, i) in replies.slice(1)"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <div class="max-w-[680px] mx-auto">
          <div class="flex gap-2.5 items-center">
            <a
              :href="reply.user_url"
              target="_blank"
              class="shrink-0 rounded-full"
            >
              <img
                :src="reply.avatar_template"
                class="rounded-full bg-skin-border size-[32px]"
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
    </div>
  </div>
</template>
