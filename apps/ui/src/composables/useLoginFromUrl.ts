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

      const { as: _as, login: _login, chainId: _chainId, ...query } =
        router.currentRoute.value.query;
      router.push({ query });
    },
    { immediate: true }
  );
}
