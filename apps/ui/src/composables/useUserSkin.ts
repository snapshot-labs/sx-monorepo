export type Skin = 'dark' | 'light' | 'none';

const DEFAULT_SKIN = 'light';

export function useUserSkin() {
  const store = useStorage<Skin>('skin', 'none');
  const currentMode = computed(() =>
    [DEFAULT_SKIN, 'none'].includes(store.value) ? DEFAULT_SKIN : 'dark'
  );

  function toggleSkin() {
    store.value = ['light', 'none'].includes(store.value) ? 'dark' : 'light';
  }

  function setSkin(skin: Skin) {
    store.value = skin;
  }

  watchEffect(() => {
    if (currentMode.value === DEFAULT_SKIN) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  });

  return {
    DEFAULT_SKIN,
    currentMode,
    toggleSkin,
    setSkin
  };
}
