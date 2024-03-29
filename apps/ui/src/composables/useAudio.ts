export function useAudio() {
  let ctx: AudioContext;
  let playback: AudioBufferSourceNode;

  const audio = ref<AudioBuffer | null>(null);
  const state = ref<'playing' | 'paused' | 'stopped'>('stopped');

  async function init(input: ArrayBuffer) {
    ctx = new AudioContext();
    audio.value = await ctx.decodeAudioData(input);
  }

  async function play() {
    switch (state.value) {
      case 'playing':
        return;
      case 'paused':
        ctx.resume();
        break;
      case 'stopped':
        playback = ctx.createBufferSource();
        playback.buffer = audio.value;
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

  async function stop() {
    if (state.value === 'stopped') return;

    playback.stop();
    state.value = 'stopped';
  }

  return { state, play, pause, stop, init };
}
