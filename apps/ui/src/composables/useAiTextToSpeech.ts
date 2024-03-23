const SIDEKICK_URL = 'https://sh5.co';

export function useAiTextToSpeech(proposalId: string) {
  const audio = ref<AudioBuffer | null>(null);
  const ctx = new AudioContext();
  const playback = ctx.createBufferSource();
  const state = ref({
    loading: false,
    error: null,
    open: false
  });
  const paused = ref(false);
  const playing = ref(false);

  async function fetchAiTextToSpeech() {
    if (!audio.value) {
      try {
        state.value.loading = true;
        const response = await fetch(`${SIDEKICK_URL}/api/ai/tts/${proposalId}`, {
          method: 'POST'
        });

        if (!response.ok) {
          try {
            const data = await response.json();

            if (data.error) {
              throw new Error(data.error.message);
            }
          } catch (e) {
            throw new Error('Unable to contact the AI service. Please try again later.');
          }
        }

        const responseBuffer = await response.arrayBuffer();

        audio.value = await ctx.decodeAudioData(responseBuffer);
        playback.buffer = audio.value;
      } catch (e) {
        state.value.error = e;
      } finally {
        state.value.loading = false;
      }
    }
  }

  async function play() {
    if (ctx.state !== 'suspended') {
      return;
    }

    if (paused.value) {
      await ctx.resume();
    } else {
      playback.connect(ctx.destination);
      playback.start(ctx.currentTime);
    }

    playing.value = true;
    paused.value = false;
  }

  async function pause() {
    if (ctx.state !== 'running') {
      return;
    }

    await ctx.suspend();
    paused.value = true;
    playing.value = false;
  }

  return { state, paused, playing, play, pause, fetchAiTextToSpeech };
}
