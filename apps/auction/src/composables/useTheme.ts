import { Theme } from '@/types';

type UserTheme = Theme | 'none';

function setup() {
  const preferredColor = usePreferredColorScheme();
  const store = useStorage<UserTheme>('theme', 'none');

  const defaultTheme = computed(() =>
    preferredColor.value === 'light' ? 'light' : 'dark'
  );
  const currentTheme = computed(() =>
    store.value !== 'none' ? store.value : defaultTheme.value
  );

  function toggleTheme() {
    store.value = currentTheme.value === 'light' ? 'dark' : 'light';
  }

  function setTheme(theme: Theme) {
    store.value = theme;
  }

  function previewTheme(theme: Theme) {
    applyTheme(theme);
  }

  function applyTheme(theme: Theme) {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }

  watchEffect(() => {
    applyTheme(currentTheme.value);
  });

  return {
    currentTheme,
    toggleTheme,
    setTheme,
    previewTheme
  };
}

export const useTheme = createSharedComposable(setup);
