export function useAudio() {
  let ctx: AudioContext;
  let playback: AudioBufferSourceNode;

  const audio = ref<AudioBuffer | null>(null);
  const state = ref<'playing' | 'paused' | 'stopped' | 'destroyed'>('stopped');

  async function init(input: ArrayBuffer) {
    ctx = new AudioContext();
    audio.value = await ctx.decodeAudioData(input);
  }

  async function play() {
    if (state.value === 'destroyed') return;

    if (state.value === 'paused') {
      ctx.resume();
    } else if (state.value === 'stopped') {
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

  async function destroy() {
    playback?.stop();
    state.value = 'destroyed';
  }

  return { state, play, pause, init, destroy };
}
