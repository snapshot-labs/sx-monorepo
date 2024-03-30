const SIDEKICK_URL = 'https://sh5.co';

export function useAiSummary() {
  const content = ref<string>('');
  const state = ref({
    loading: false,
    errored: false
  });

  async function _fetch(proposalId: string) {
    if (content.value) return true;

    try {
      state.value.loading = true;
      const response = await fetch(`${SIDEKICK_URL}/api/ai/summary/${proposalId}`, {
        method: 'POST'
      });
      const data = await response.json();

      content.value = data.result;
      state.value.errored = false;
    } catch (e) {
      state.value.errored = true;
    } finally {
      state.value.loading = false;
    }
  }

  return { state, content, fetch: _fetch };
}
