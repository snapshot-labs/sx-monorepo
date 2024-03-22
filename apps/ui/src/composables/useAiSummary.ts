const SIDEKICK_URL = 'https://sh5.co';

export function useAiSummary(proposalId: string) {
  const body = ref<string>('');
  const state = ref({
    loading: false,
    error: null,
    open: false
  });

  async function fetchAiSummary() {
    if (!body.value) {
      try {
        state.value.loading = true;
        const response = await fetch(`${SIDEKICK_URL}/api/ai/summary/${proposalId}`, {
          method: 'POST'
        });
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        body.value = data.result;
      } catch (e) {
        state.value.error = e;
      } finally {
        state.value.loading = false;
      }
    }
  }

  return { state, body, fetchAiSummary };
}
