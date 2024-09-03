<script setup lang="ts">
import { Reply } from '@/helpers/discourse';
import turndownService from '@/helpers/turndownService';
import { _rt } from '@/helpers/utils';

const props = defineProps<{
  reply: Reply;
  discussion?: string | null;
}>();

const toMarkdown = computed(() =>
  turndownService({ discussion: props.discussion || '' })
);
</script>

<template>
  <div>
    <div class="flex gap-2.5 items-center">
      <a :href="reply.user_url" target="_blank" class="shrink-0 rounded-full">
        <img
          :src="reply.avatar_template"
          class="rounded-full inline-block bg-skin-border size-[32px]"
        />
      </a>
      <div class="flex flex-col leading-4 gap-1">
        <a :href="reply.user_url" target="_blank" v-text="reply.name" />
        <span class="text-skin-text text-sm" v-text="_rt(reply.created_at)" />
      </div>
    </div>
    <UiMarkdown class="text-md pt-3 pb-2" :body="toMarkdown(reply.cooked)" />
    <div class="text-sm space-x-2.5 flex">
      <div class="items-center flex gap-1">
        <IH-thumb-up /> {{ reply.like_count }}
      </div>
      <div class="items-center flex gap-1">
        <IH-annotation /> {{ reply.reply_count }}
      </div>
      <div class="items-center flex gap-1"><IH-eye /> {{ reply.reads }}</div>
    </div>
  </div>
</template>
