<script lang="ts" setup>
import { DOCS_URL, FLAGS } from '@/helpers/constants';
import { Proposal } from '@/types';

const props = defineProps<{
  item: Proposal;
}>();

const isHidden = ref(props.item.flagged);

const isDMCA = computed(() => props.item.flag_code === FLAGS.DMCA);
const isWithheld = computed(() => props.item.flag_code === FLAGS.WITHHELD);
</script>

<template>
  <UiAlert v-if="isDMCA" type="error" class="mb-3">
    This content has been removed in response to a DMCA request. If you have any
    questions or believe this was an error, please
    <AppLink :to="`${DOCS_URL}/contact-us`">contact us</AppLink>.
  </UiAlert>
  <UiAlert v-else-if="isWithheld" type="warning" class="mb-3">
    <IH-information-circle class="inline-block -mt-0.5 mr-1" />
    This content is no longer available. It has been withheld in response to a
    request we received. If you have any questions or believe this was an error,
    please <AppLink :to="`${DOCS_URL}/contact-us`">contact us</AppLink>.
  </UiAlert>
  <UiAlert v-else-if="item.flagged && isHidden" type="error" class="mb-3">
    <UiButton class="float-right ml-2" @click="isHidden = false">Show</UiButton>
    This content might contain scams, offensive material, or be malicious in
    nature. Please proceed with caution.
  </UiAlert>
  <slot v-if="!isHidden" />
</template>
