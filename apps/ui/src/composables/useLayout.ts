export function useLayout() {
  const route = useRoute();
  const { isWhiteLabel } = useWhiteLabel();

  const isStandaloneLayout = computed(() => {
    if (isWhiteLabel.value) return true;

    return route.matched[0]?.name === 'auction';
  });

  return { isStandaloneLayout };
}
