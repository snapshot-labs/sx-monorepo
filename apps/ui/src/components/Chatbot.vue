<script setup lang="ts">
const { prompt, handleSubmit, handleInsert, history, loading, page, context } =
  useChatbot({
    onNewMessage: () => scrollToBottom()
  });

defineEmits<{ (e: 'close'): void }>();

const containerRef = ref<HTMLElement | null>(null);
const promptRef = ref<HTMLTextAreaElement | null>(null);
const showContext = ref(false);

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
}

function toggleContext() {
  showContext.value = !showContext.value;
}

function adjustHeight() {
  if (!promptRef.value) return;

  promptRef.value.style.height = '44px';
  const newHeight = Math.min(160, promptRef.value.scrollHeight);
  promptRef.value.style.height = `${newHeight}px`;
}

function handleEnterKey(event) {
  if (event.shiftKey) return;

  event.preventDefault();
  handleSubmit();
}

watch(prompt, async () => {
  await nextTick();

  adjustHeight();
  scrollToBottom();
});

onMounted(async () => {
  if (promptRef.value) {
    promptRef.value.focus();
  }

  await nextTick();

  adjustHeight();
  scrollToBottom();
});
</script>

<template>
  <div>
    <div
      class="animate-fade-in z-50 _fixed top-0 bottom-0 bg-black/40 left-0 right-0"
      @click="$emit('close')"
    />
    <div
      class="z-50 fixed h-full xl:max-h-[calc(100vh-24px)] xl:h-[600px] bottom-0 xl:shadow-lg left-0 xl:left-auto right-0 xl:w-[440px] xl:border xl:border-b-0 bg-skin-bg flex flex-col xl:rounded-t-lg xl:m-3.5 xl:mb-0"
    >
      <div>
        <button
          type="button"
          class="absolute right-0 -top-0.5 p-4"
          @click="$emit('close')"
        >
          <IH-x />
        </button>
        <div class="px-4 py-3 border-b">
          <button
            v-if="showContext"
            class="inline-flex gap-2 items-center"
            @click="toggleContext"
          >
            <IH-arrow-sm-left />
            <h3 v-text="'Context'" />
          </button>
          <div v-else class="flex items-center gap-2">
            <IH-sparkles />
            <h3 v-text="'Ask AI'" />
          </div>
        </div>
      </div>

      <div
        v-if="!showContext"
        ref="containerRef"
        class="p-4 flex-1 space-y-2 overflow-auto"
      >
        <div
          v-for="(message, i) in history"
          :key="i"
          class="text-skin-link"
          :class="message.role === 'user' ? 'text-right' : 'text-left'"
        >
          <div
            v-if="message.role === 'user'"
            class="py-2 inline-block leading-6 px-3 bg-skin-border/60 rounded-[22px] ml-6"
          >
            <UiMarkdown
              :body="message.content as string"
              class="!text-[18px]"
            />
          </div>
          <div
            v-if="message.role === 'assistant'"
            class="space-y-2.5 leading-6 py-2"
          >
            <template v-for="(chunk, i2) in message.content" :key="i2">
              <UiMarkdown
                v-if="chunk.type === 'text'"
                :body="chunk.value"
                class="!text-[18px]"
              />

              <button
                v-if="chunk.type === 'input'"
                class="px-3 py-2.5 border bg-skin-bg rounded-lg hover:border-skin-link leading-6 cursor-pointer text-left"
                @click="handleInsert(chunk.id, chunk.value)"
              >
                <span
                  class="bg-skin-border text-skin-link text-sm rounded-full px-1.5 py-0.5 mr-1.5"
                  v-text="chunk.id"
                />
                {{ chunk.value }}
              </button>

              <a
                v-if="chunk.type === 'link'"
                :href="chunk.value"
                target="_blank"
                class="border px-3 py-2.5 inline-block rounded-lg"
              >
                {{ chunk.value }}
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </template>
          </div>
        </div>
        <div v-if="loading" class="space-x-2">
          <UiLoading />
          <span>Thinking...</span>
        </div>
      </div>

      <div v-if="showContext" class="p-4 overflow-auto flex-1 space-y-3">
        <div v-if="page?.path">
          <h4 class="mb-2 eyebrow flex items-center gap-2">
            <IH-link />
            Route
          </h4>
          <div
            v-if="context.purpose"
            class="text-skin-link leading-6 mb-2"
            v-text="context.purpose"
          />
          <div v-for="(item, i) in page" :key="i" class="flex gap-2">
            <div class="w-9 shrink-0 truncate" v-text="i" />
            <div class="text-skin-link truncate" v-text="item" />
          </div>
        </div>

        <div v-if="Object.keys(context.data || {}).length > 0">
          <h4 class="mb-2 eyebrow flex items-center gap-2">
            <IH-database />
            Data
          </h4>
          <div class="space-y-2">
            <div v-for="(d, i) in context.data" :key="i">
              <h4 class="text-skin-link" v-text="i" />
              <div
                v-if="!['object', 'array'].includes(typeof d)"
                class="text-skin-link truncate"
                v-text="d"
              />
              <div v-else>
                <div v-for="(d2, i2) in d" :key="i2" class="flex gap-2">
                  <div class="w-9 shrink-0 truncate" v-text="i2" />
                  <div class="text-skin-link truncate" v-text="d2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="Object.keys(context.inputs || {}).length > 0">
          <h4 class="mb-2 eyebrow flex items-center gap-2">
            <IH-cursor-click />
            Inputs
          </h4>
          <div class="space-y-2">
            <div v-for="(d, i) in context.inputs" :key="i">
              <h4 class="text-skin-link" v-text="i" />
              <div
                v-if="!['object', 'array'].includes(typeof d)"
                class="text-skin-link truncate"
                v-text="d"
              />
              <div v-else>
                <div v-for="(d2, i2) in d" :key="i2" class="flex gap-2">
                  <div class="w-9 shrink-0 truncate" v-text="i2" />
                  <div class="text-skin-link truncate" v-text="d2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 s-box border-t">
        <div class="bg-skin-border rounded-lg flex flex-col">
          <textarea
            ref="promptRef"
            v-model="prompt"
            placeholder="How I can help you today?"
            class="bg-transparent resize-none px-2.5 py-2 w-full rounded-lg focus:outline-none text-skin-link"
            @input="adjustHeight"
            @keydown.enter="handleEnterKey"
          />
          <div class="p-2.5 pt-0 flex justify-between text-sm items-center">
            <button
              class="inline-block bg-skin-bg rounded-lg border px-2 text-skin-link"
              @click="toggleContext"
            >
              Context
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
