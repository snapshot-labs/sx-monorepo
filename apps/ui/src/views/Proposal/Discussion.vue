<script setup lang="ts">
import { loadReplies, Reply } from '@/helpers/discourse';
import { sanitizeUrl } from '@/helpers/utils';
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
        v-for="(reply, i) in replies"
        :key="i"
        class="py-4 border-b last:border-b-0"
      >
        <DiscussionTopicItem
          :reply="reply"
          :discussion="discussion"
          class="max-w-[680px] mx-auto"
        />
      </div>
    </div>
  </div>
</template>
