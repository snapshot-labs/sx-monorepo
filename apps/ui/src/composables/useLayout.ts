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
    const childRouteName = route.matched[1]?.name?.toString();

    if (routeName && AUCTION_ROUTES.includes(routeName)) return true;
    if (childRouteName === 'alias-authorize') return true;

    return false;
  });

  return { isStandaloneLayout };
}
