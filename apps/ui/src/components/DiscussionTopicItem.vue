<script setup lang="ts">
import { Reply } from '@/helpers/discourse';
import { _rt, stripHtmlTags } from '@/helpers/utils';

defineProps<{
  reply: Reply;
}>();
</script>

<template>
  <div>
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
        <span class="text-skin-text text-sm" v-text="_rt(reply.created_at)" />
      </div>
    </div>
    <UiMarkdown class="text-md pt-3 pb-2" :body="stripHtmlTags(reply.cooked)" />
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
</template>
