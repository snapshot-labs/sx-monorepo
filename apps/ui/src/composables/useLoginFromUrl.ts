export function useLoginFromUrl() {
  const router = useRouter();
  const { login } = useWeb3();
  const { connectors } = useConnectors();

  /** immediate: true so first-paint deep links (?login / ?as) fire on initial load. */
  watch(
    () => {
      const q = router.currentRoute.value.query;
      return q.login ? 'sandbox' : q.as ? 'guest' : null;
    },
    async type => {
      const connector = type && connectors.value.find(c => c.type === type);
      if (!connector) return;

      await login(connector);

      const query = { ...router.currentRoute.value.query };
      delete query.as;
      delete query.login;
      delete query.chainId;
      router.push({ query });
    },
    { immediate: true }
  );
}
