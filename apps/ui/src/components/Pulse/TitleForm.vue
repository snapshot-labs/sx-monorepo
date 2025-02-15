<script setup lang="ts">
const title = ref('');
const discussion = ref('');

const TITLE_DEFINITION = {
  type: 'string',
  title: 'Ask an open question',
  minLength: 1,
  maxLength: 256
};

const BODY_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Context',
  maxLength: 10e3,
  examples: ['Add more context…']
};

const EXAMPLES = [
  "What features you'd like to see?",
  // 'What should be our main KPI?',
  'Who are the best delegates?'
];
</script>

<template>
  <div class="max-w-[680px]">
    <div class="s-box">
      <div class="border rounded-lg p-4 mb-4 bg-skin-bg space-y-4">
        <div>
          <UiInputString
            v-model="title"
            :definition="TITLE_DEFINITION"
            :required="true"
          />
          <div class="space-x-2">
            e.g.
            <a
              v-for="(example, i) in EXAMPLES"
              :key="i"
              class="inline-block border text-skin-link text-[15px] rounded-full bg-skin-bg px-2"
              @click="title = example"
              v-text="example"
            />
          </div>
        </div>
        <div v-if="title" class="s-base">
          <UiComposer v-model="discussion" :definition="BODY_DEFINITION" />
        </div>
      </div>
    </div>
  </div>
</template>
