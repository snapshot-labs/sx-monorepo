const SIDEKICK_URL = 'https://sh5.co';

export function useAi<T extends 'summary' | 'speech'>(type: T, proposalId: string) {
  type ContentType = T extends 'summary' ? string : ArrayBuffer;

  const content = ref(null) as Ref<ContentType | null>;
  const state = ref({
    loading: false,
    errored: false
  });

  async function _fetch() {
    if (state.value.loading) return;

    try {
      state.value.loading = true;
      content.value = (await (type === 'summary' ? fetchSummary() : fetchSpeech())) as ContentType;
      state.value.errored = false;
    } catch (e) {
      state.value.errored = true;
    } finally {
      state.value.loading = false;
    }
  }

  async function fetchSummary(): Promise<string> {
    const response = await fetch(`${SIDEKICK_URL}/api/ai/summary/${proposalId}`, {
      method: 'POST'
    });
    const data = await response.json();

    return data.result as string;
  }

  async function fetchSpeech(): Promise<ArrayBuffer> {
    const response = await fetch(`${SIDEKICK_URL}/api/ai/tts/${proposalId}`, {
      method: 'POST'
    });

    return response.arrayBuffer();
  }

  return { state, content, fetch: _fetch };
}
