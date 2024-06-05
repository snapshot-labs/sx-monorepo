type Skin = 'dark' | 'light' | 'none';

export function useUserSkin() {
  const store = useStorage<Skin>('skin', 'none');
  const currentMode = computed(() => (['light', 'none'].includes(store.value) ? 'light' : 'dark'));

  function toggleSkin() {
    store.value = ['light', 'none'].includes(store.value) ? 'dark' : 'light';
  }

  watchEffect(() => {
    if (currentMode.value === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  });

  return {
    currentMode,
    toggleSkin
  };
}
