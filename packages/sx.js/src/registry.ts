export function buildRegistry<const T>(
  entries: [address: string | undefined, config: T][],
  formatAddress: (address: string) => string = address => address
): Record<string, T> {
  const registry: Record<string, T> = {};
  for (const [address, config] of entries) {
    if (address) registry[formatAddress(address)] = config;
  }

  return registry;
}
