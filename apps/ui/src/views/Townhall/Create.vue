<script setup lang="ts">
import router from '@/routes';

const route = useRoute();
const { sendDiscussion } = useTownhall();
const { addNotification } = useUiStore();

const title = ref(route.query.title as string);
const body = ref('');
const strategy = ref('anyone');
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
    { id: 'anyone', name: 'Anyone' },
    { id: 'snapshot', name: 'Snapshot users' },
    { id: 'hats-protocol', name: 'Hats protocol role(s)' },
    { id: 'zupass', name: 'Zupass holder' }
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

  try {
    const res = await sendDiscussion(title.value, body.value);

    const id = res.events.find(event => event.key === 'new_discussion').data.id;

    await router.push({ name: 'townhall-discussion', params: { id } });
  } catch (e) {
    addNotification('error', e.message);
  }

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
