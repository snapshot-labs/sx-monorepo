<script lang="ts" setup>
import { FLAGS, HELPDESK_URL } from '@/helpers/constants';
import { Proposal } from '@/types';

const props = defineProps<{
  item: Proposal;
}>();

const isHidden = ref(props.item.flag_code === FLAGS.MALICIOUS);

const isDMCA = computed(() => props.item.flag_code === FLAGS.DMCA);

const processedTitle = computed(() => {
  return isDMCA.value ? '' : props.item.title;
});

const processedBody = computed(() => {
  return isDMCA.value
    ? '> This content has been removed due to a DMCA request.'
    : props.item.body;
});
</script>

<template>
  <UiAlert v-if="isDMCA" type="error" class="mb-3">
    This content has been removed in response to a DMCA request. If you have any
    questions or believe this was an error, please
    <AppLink :to="HELPDESK_URL">contact us</AppLink>.
  </UiAlert>
  <UiAlert v-else-if="item.flagged && isHidden" type="error" class="mb-3">
    <UiButton class="float-right ml-2" @click="isHidden = false">Show</UiButton>
    This content might contain scams, offensive material, or be malicious in
    nature. Please proceed with caution.
  </UiAlert>
  <slot v-if="!isHidden" :title="processedTitle" :body="processedBody" />
</template>
