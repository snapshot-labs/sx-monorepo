<script setup lang="ts">
import { _n, _p } from '@/helpers/utils';

const props = defineProps<{ statement: any }>();

const choice = computed(() => {
  const { scores_1, scores_2, scores_3 } = props.statement;
  const scores = [scores_1, scores_2, scores_3];

  return scores.indexOf(Math.max(...scores)) + 1;
});
</script>

<template>
  <div class="p-4 border rounded-md text-md space-y-3">
    <div class="text-skin-link">{{ statement.body }}</div>
    <div class="flex text-[17px] items-center gap-2.5">
      <div
        v-if="statement.vote_count > 0"
        :class="{
          'bg-skin-success/10 border-skin-success': choice === 1,
          'bg-skin-danger/10 border-skin-danger': choice === 2,
          'bg-skin-text/10 border-skin-text': choice === 3
        }"
        class="border text-skin-link rounded-md inline-block px-2.5 py-1"
      >
        <div v-if="choice === 1">
          <IH-check class="inline-block text-skin-success" />
          {{ _p(statement.scores_1 / statement.vote_count, 1) }} agree
        </div>
        <div v-else-if="choice === 2">
          <IH-x class="inline-block text-skin-danger" />
          {{ _p(statement.scores_2 / statement.vote_count, 1) }} disagree
        </div>
        <div v-else-if="choice === 3">
          <IH-minus-sm class="inline-block text-skin-text" />
          {{ _p(statement.scores_3 / statement.vote_count, 1) }} pass
        </div>
      </div>
      <div class="flex-1" v-text="`${_n(statement.vote_count)} votes`" />
      <div class="justify-end" v-text="`#${statement.statement_id}`" />
    </div>
  </div>
</template>
