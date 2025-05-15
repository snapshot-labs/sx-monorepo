<script lang="ts" setup>
import { FLAGS, HELPDESK_URL } from '@/helpers/constants';
import { Proposal } from '@/types';

const props = defineProps<{
  item: Proposal;
}>();

const isHidden = ref(false);

const isDMCA = computed(() => props.item.flag_code === FLAGS.DMCA);

const processedTitle = computed(() => {
  return isDMCA.value ? '' : props.item.title;
});

const processedBody = computed(() => {
  return isDMCA.value
    ? '> This content has been removed due to a DMCA request.'
    : props.item.body;
});

onMounted(() => {
  isHidden.value = props.item.flag_code === FLAGS.MALICIOUS;
});
</script>

<template>
  <UiAlert
    v-if="item.flag_code === FLAGS.MALICIOUS && isHidden"
    type="error"
    class="mb-3"
  >
    <UiButton class="float-right ml-2" @click="isHidden = false">Show</UiButton>
    This content might contain scams, offensive material, or be malicious in
    nature. Please proceed with caution.
  </UiAlert>
  <UiAlert v-else-if="isDMCA" type="error" class="mb-3">
    This content has been removed in response to a DMCA request. If you have any
    questions or believe this was an error, please
    <AppLink :to="HELPDESK_URL">contact us</AppLink>.
  </UiAlert>
  <slot v-if="!isHidden" :title="processedTitle" :body="processedBody" />
</template>
