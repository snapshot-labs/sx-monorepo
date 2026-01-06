const AUCTION_ROUTES = ['auctions', 'auction'];

export function useLayout() {
  const route = useRoute();
  const { isWhiteLabel } = useWhiteLabel();

  const isStandaloneLayout = computed(() => {
    if (isWhiteLabel.value) return true;

    const routeName = route.matched[0]?.name;

    if (routeName) {
      return AUCTION_ROUTES.includes(routeName.toString());
    }

    return false;
  });

  return { isStandaloneLayout };
}
