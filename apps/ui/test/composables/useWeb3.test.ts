// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { useWeb3 } from '@/composables/useWeb3';

vi.mock('@/composables/useConnectors', () => ({
  useConnectors: () => ({ connectors: { value: [] } })
}));

vi.mock('@/stores/users', () => ({
  useUsersStore: () => ({ fetchUser: vi.fn(), getUser: () => undefined })
}));

const ADDRESS =
  '0x0176adee98016481787b0680b9d124a4ac5124bfedbcbee5da00cf16c72beab7';

// A Starknet wallet only has `on` and `off`, no `removeAllListeners`.
function createStarknetConnector() {
  const listeners = new Set<(accounts: string[]) => void>();
  const provider = {
    chainId: '0x534e5f4d41494e',
    selectedAddress: ADDRESS,
    // Answers the network lookups ethers' Web3Provider makes in the background
    request: async ({ method }: { method?: string }) =>
      method === 'eth_accounts' ? [] : '0x1',
    on: (event: string, handler: (accounts: string[]) => void) => {
      if (event === 'accountsChanged') listeners.add(handler);
    },
    off: (event: string, handler: (accounts: string[]) => void) => {
      if (event === 'accountsChanged') listeners.delete(handler);
    }
  };
  const connector = {
    id: 'argentx',
    type: 'argentx',
    provider,
    connect: vi.fn(),
    autoConnect: vi.fn(),
    disconnect: vi.fn()
  };

  return { connector: connector as any, listeners };
}

describe('useWeb3', () => {
  it('should stop following a Starknet wallet after logout', async () => {
    const { connector, listeners } = createStarknetConnector();
    const { login, logout, auth } = useWeb3();

    await login(connector);
    expect(auth.value).not.toBeNull();
    expect(listeners.size).toBe(1);

    logout();
    expect(listeners.size).toBe(0);

    // A later account change in the wallet must not log the user back in
    await Promise.all([...listeners].map(handler => handler([ADDRESS])));
    expect(auth.value).toBeNull();
    expect(connector.connect).toHaveBeenCalledTimes(1);
  });

  it('should keep a single listener across logins', async () => {
    const { connector, listeners } = createStarknetConnector();
    const { login, logout } = useWeb3();

    await login(connector);
    logout();
    await login(connector);

    expect(listeners.size).toBe(1);
    logout();
  });

  it('should still remove all listeners from wallets that support it', async () => {
    const { connector } = createStarknetConnector();
    const removeAllListeners = vi.fn();
    const evmConnector = {
      ...connector,
      id: 'injected',
      type: 'injected',
      provider: { ...connector.provider, off: vi.fn(), removeAllListeners }
    };
    const { login, logout } = useWeb3();

    await login(evmConnector);
    logout();

    expect(removeAllListeners).toHaveBeenCalledTimes(1);
    expect(evmConnector.provider.off).not.toHaveBeenCalled();
  });
});
