import { Theme } from '@/types';

type UserTheme = Theme | 'none';

const DEFAULT_THEME = 'light';

export function useTheme() {
  const store = useStorage<UserTheme>('theme', 'none');
  const currentTheme = computed(() =>
    [DEFAULT_THEME, 'none'].includes(store.value) ? DEFAULT_THEME : 'dark'
  );

  function toggleTheme() {
    store.value = ['light', 'none'].includes(store.value) ? 'dark' : 'light';
  }

  function setTheme(theme: Theme) {
    store.value = theme;
  }

  function previewTheme(theme: Theme) {
    applyTheme(theme);
  }

  function applyTheme(theme: Theme) {
    if (theme === DEFAULT_THEME) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }

  watchEffect(() => {
    applyTheme(currentTheme.value);
  });

  return {
    DEFAULT_THEME,
    currentTheme,
    toggleTheme,
    setTheme,
    previewTheme
  };
}
