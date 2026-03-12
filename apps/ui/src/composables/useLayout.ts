const AUCTION_ROUTES = [
  'auctions',
  'auction',
  'auction-verify-standalone',
  'auction-verify',
  'auction-invite'
];

export function useLayout() {
  const route = useRoute();
  const { isWhiteLabel } = useWhiteLabel();
  const { isAuctionApp } = useApp();

  const isStandaloneLayout = computed(() => {
    if (isWhiteLabel.value || isAuctionApp.value) return true;

    const routeName = route.matched[0]?.name?.toString();

    if (routeName) {
      return (
        AUCTION_ROUTES.includes(routeName) || routeName === 'alias-authorize'
      );
    }

    return false;
  });

  return { isStandaloneLayout };
}
