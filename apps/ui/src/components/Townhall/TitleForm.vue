<script setup lang="ts">
const router = useRouter();
const title = ref('');

const TITLE_DEFINITION = {
  type: 'string',
  title: 'Ask an open question',
  minLength: 1,
  maxLength: 256
};

const EXAMPLES = [
  "What features you'd like to see?",
  // 'What should be our main KPI?',
  'Who are the best delegates?'
];

function handleSubmit() {
  router.push({ name: 'townhall-create', query: { title: title.value } });
}
</script>

<template>
  <div>
    <div class="s-box">
      <div class="border rounded-lg p-4 mb-4 bg-skin-bg space-y-4">
        <div>
          <UiInputString
            v-model="title"
            :definition="TITLE_DEFINITION"
            :required="true"
            @keyup.enter="handleSubmit"
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
      </div>
    </div>
  </div>
</template>
