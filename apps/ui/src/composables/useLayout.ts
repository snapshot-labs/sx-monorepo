export function useLayout() {
  const route = useRoute();
  const { isWhiteLabel } = useWhiteLabel();

  const isStandaloneLayout = computed(() => {
    if (isWhiteLabel.value) return true;

    const currentRouteName = route.name?.toString();

    return currentRouteName === 'settings-alias-authorize';
  });

  return { isStandaloneLayout };
}
