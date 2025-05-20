const CAPSULE_URL =
  import.meta.env.VITE_CAPSULE_URL || 'https://api.capsule.box';

export type Context = {
  purpose?: string;
  data?: Record<string, any>;
  inputs?: Record<string, Input>;
};

export type Input = {
  value?: any;
  definition?: Record<string, any>;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string | any[];
};

let vars = {};

const chatbotOpen: Ref<boolean> = ref(false);
const prompt: Ref<string> = ref('');
const loading: Ref<boolean> = ref(false);
const history: Ref<Message[]> = ref([]);
const context: Ref<Context> = ref({});

export function useChatbot(options?: Record<string, any>) {
  const route = useRoute();
  const router = useRouter();

  router.beforeEach(() => reset());

  function reset() {
    chatbotOpen.value = false;
    history.value = [];
    context.value = {};
    vars = {};
  }

  const page = computed(() => ({
    title: window.document?.title || undefined,
    path: route.path || undefined,
    name: route?.name || undefined
  }));

  function setContext(newContext: Context) {
    context.value = newContext;
  }

  function setVars(newVars: Record<string, Ref>) {
    vars = newVars;
  }

  function openChatbot(trigger?: string) {
    if (trigger) handleSubmit(trigger);
    chatbotOpen.value = true;

    if (typeof options?.onOpen === 'function') options.onOpen();
  }

  function handleInsert(k: string, v: any) {
    if (vars[k]) vars[k].value = v;
  }

  async function handleSubmit(trigger?: string) {
    const newPrompt = trigger || prompt.value;

    history.value.push({
      role: 'user',
      content: newPrompt
    });

    if (typeof options?.onNewMessage === 'function') options.onNewMessage();

    loading.value = true;
    prompt.value = '';

    const res = await fetch(`${CAPSULE_URL}/v1/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: newPrompt,
        context: { ...context.value, messages: history.value }
      })
    });
    const { messages } = await res.json();

    history.value.push({
      role: 'assistant',
      content: messages
    });

    if (typeof options?.onNewMessage === 'function') options.onNewMessage();

    loading.value = false;
  }

  return {
    page,
    context,
    setContext,
    setVars,
    chatbotOpen,
    prompt,
    loading,
    history,
    handleSubmit,
    openChatbot,
    handleInsert
  };
}
