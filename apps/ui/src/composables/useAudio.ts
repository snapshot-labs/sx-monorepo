export function useAudio() {
  let ctx: AudioContext;
  let playback: AudioBufferSourceNode;

  const audio = ref<AudioBuffer | null>(null);
  const state = ref<'playing' | 'paused' | 'stopped'>('stopped');

  async function init(input: ArrayBuffer) {
    ctx = new AudioContext();
    playback = ctx.createBufferSource();

    audio.value = await ctx.decodeAudioData(input);
    playback.buffer = audio.value;
  }

  async function play() {
    if (state.value === 'playing') return;

    if (state.value === 'paused') {
      ctx.resume();
    } else if (state.value === 'stopped') {
      playback.connect(ctx.destination);
      playback.start(ctx.currentTime);
      playback.onended = () => (state.value = 'stopped');
    }

    state.value = 'playing';
  }

  async function pause() {
    if (state.value !== 'playing') return;

    await ctx.suspend();
    state.value = 'paused';
  }

  return { state, play, pause, init };
}
