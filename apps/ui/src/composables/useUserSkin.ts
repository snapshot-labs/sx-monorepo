type Skin = 'dark' | 'light' | 'none';

const preferredColor = usePreferredColorScheme();
export function useUserSkin() {
  const store = useStorage<Skin>('skin', 'none');
  const currentMode = computed(() =>
    store.value === 'none'
      ? (preferredColor.value as 'dark' | 'light')
      : store.value
  );

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
