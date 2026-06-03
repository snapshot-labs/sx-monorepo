export function useGuestLoginFromUrl() {
  const router = useRouter();
  const { login } = useWeb3();
  const { connectors } = useConnectors();

  watch(
    () => router.currentRoute.value.query.as,
    async address => {
      if (!address) return;

      const guest = connectors.value.find(c => c.type === 'guest');
      if (!guest) return;

      await login(guest);

      const query = { ...router.currentRoute.value.query };
      delete query.as;
      delete query.chainId;

      router.push({ query });
    }
  );
}
