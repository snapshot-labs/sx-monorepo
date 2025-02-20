<script setup lang="ts">
import { _n } from '@/helpers/utils';

defineProps<{ statement: any }>();
</script>

<template>
  <div class="p-4 border rounded-md text-md space-y-3">
    <div class="text-skin-link">{{ statement.body }}</div>
    <div class="flex text-[17px] items-center gap-2.5">
      <div
        :class="{
          'bg-skin-success/10 border-skin-success':
            statement.scores_1 > statement.scores_2,
          'bg-skin-danger/10 border-skin-danger':
            statement.scores_1 < statement.scores_2
        }"
        class="border text-skin-link rounded-md inline-block px-2.5 py-1"
      >
        <IH-check
          v-if="statement.scores_1 > statement.scores_2"
          class="inline-block text-skin-success"
        />
        <IH-x
          v-if="statement.scores_1 < statement.scores_2"
          class="inline-block text-skin-danger"
        />
        {{ statement.scores_1 }}%
        {{ statement.scores_1 > statement.scores_2 ? 'agree' : 'disagree' }}
      </div>
      <div class="justify-end" v-text="`${_n(statement.vote_count)} votes`" />
    </div>
  </div>
</template>
