<script setup lang="ts">
import { client } from '@/helpers/kbyte';
import router from '@/routes';

const route = useRoute();

const title = ref(route.query.title as string);
const body = ref('');
const strategy = ref('');
const submitLoading = ref(false);

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

const STRATEGY_DEFINITION = {
  type: 'string',
  enum: ['ACTIVE', 'INACTIVE'],
  options: [
    { id: 'ACTIVE', name: 'Snapshot users' },
    { id: 'ACTIVE', name: 'Hats protocol role(s)' },
    { id: 'ACTIVE', name: 'Zupass holder' }
  ],
  title: 'Who can participate?'
};

const EXAMPLES = [
  "What features you'd like to see?",
  // 'What should be our main KPI?',
  'Who are the best delegates?'
];

async function handleSubmit() {
  submitLoading.value = true;

  const res = await client.requestAsync('broadcast', {
    type: 'discussion',
    from: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    sig: '0xf0e14ebfa7f08ee13811725e8171465f710decd56a1e4c67cffa99e2e51acf742ef326836affeb4c8c110e89818895acc24cb0893f4bae47eddbbd57138c6ca41b',
    payload: {
      author: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      title: title.value,
      body: body.value
    }
  });
  await router.push({ name: 'pulse-discussion', params: { id: res.id } });

  submitLoading.value = false;
}
</script>

<template>
  <div class="pt-5">
    <UiContainer class="!max-w-[710px] s-box space-y-3">
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
      <div class="s-base">
        <UiComposer v-model="body" :definition="BODY_DEFINITION" />
      </div>
      <div>
        <UiSelect v-model="strategy" :definition="STRATEGY_DEFINITION" />
      </div>
      <UiButton
        class="primary flex items-center space-x-1"
        :disabled="submitLoading"
        @click="handleSubmit"
      >
        <div>Publish</div>
        <IH-paper-airplane class="rotate-90 relative left-[2px]" />
      </UiButton>
    </UiContainer>
  </div>
</template>
