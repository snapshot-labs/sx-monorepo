import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn
} from 'bun:test';
import Walletconnect from '../src/connectors/walletconnect';

const provider = { request: mock() };
let isCancelled = false;
let hasEmptyProviderUpdate = false;
let hasRestoredProvider = false;
let hasProviderUpdate = true;
const eventListeners = new Set<(event: unknown) => void>();
const providerListeners = new Set<(state: unknown) => void>();
const appKit = {
  getWalletProvider: mock(() => (hasRestoredProvider ? provider : undefined)),
  open: mock(async (options?: unknown) => options),
  close: mock(() => {}),
  disconnect: mock(async () => {}),
  setThemeMode: mock(async (theme: string) => theme),
  subscribeEvents: mock((callback: (event: unknown) => void) => {
    eventListeners.add(callback);
    if (isCancelled) {
      queueMicrotask(() => callback({ data: { event: 'MODAL_CLOSE' } }));
    }
    return () => eventListeners.delete(callback);
  }),
  subscribeProviders: mock((callback: (state: unknown) => void) => {
    providerListeners.add(callback);
    if (!isCancelled && hasProviderUpdate) {
      queueMicrotask(() => {
        if (hasEmptyProviderUpdate) callback({});
        callback({ eip155: provider });
      });
    }
    return () => providerListeners.delete(callback);
  })
};
const createAppKit = mock((options: unknown) => ({ ...appKit, options }));
mock.module('@reown/appkit', () => ({ createAppKit }));
const reset = mock((view: string, data?: unknown) => ({ view, data }));
mock.module('@reown/appkit-controllers', () => ({
  RouterController: { reset }
}));

const wallet = {
  id: 'test-native-wallet',
  name: 'Native wallet',
  mobile_link: 'nativewallet://'
};

function makeConnector(selectedWallet?: typeof wallet) {
  return new Walletconnect({
    id: selectedWallet ? 'native-wallet' : 'walletconnect',
    type: 'walletconnect',
    info: { name: selectedWallet?.name ?? 'WalletConnect' },
    options: {
      projectId: 'test-project',
      name: 'Snapshot',
      url: 'https://snapshot.box',
      getTheme: () => 'dark',
      ...(selectedWallet ? { wallet: selectedWallet } : {})
    },
    provider: undefined,
    autoConnectOnly: false
  });
}

beforeEach(() => {
  isCancelled = false;
  hasEmptyProviderUpdate = false;
  hasRestoredProvider = false;
  hasProviderUpdate = true;
  eventListeners.clear();
  providerListeners.clear();
  createAppKit.mockClear();
  appKit.open.mockClear();
  reset.mockClear();
});
afterEach(() => mock.restore());

describe('WalletConnect wallet selection', () => {
  it('opens the selected native wallet and preserves the provider path', async () => {
    const connector = makeConnector(wallet);
    await connector.connect();
    expect(appKit.open).toHaveBeenCalledWith({
      view: 'ConnectingWalletConnectBasic'
    });
    expect(reset).toHaveBeenCalledWith('ConnectingWalletConnect', { wallet });
    expect(createAppKit.mock.calls[0][0]).toMatchObject({
      projectId: 'test-project',
      metadata: { name: 'Snapshot', url: 'https://snapshot.box' },
      themeMode: 'dark'
    });
    expect(createAppKit.mock.calls[0][0]).not.toHaveProperty('metadata.wallet');
    expect(connector.provider).toBe(provider);
  });

  it('keeps the generic wallet selection unchanged', async () => {
    await makeConnector().connect();
    expect(appKit.open).toHaveBeenCalledWith(undefined);
    expect(reset).not.toHaveBeenCalled();
  });

  it('can cancel and retry without registering a cancelled provider', async () => {
    spyOn(console, 'error').mockImplementation(() => {});
    const connector = makeConnector(wallet);
    isCancelled = true;
    await connector.connect();
    expect(connector.provider).toBeUndefined();
    isCancelled = false;
    await connector.connect();
    expect(connector.provider).toBe(provider);
    expect(appKit.open).toHaveBeenCalledTimes(2);
  });

  it('waits for an Ethereum provider after an empty provider update', async () => {
    hasEmptyProviderUpdate = true;
    const connector = makeConnector(wallet);
    await connector.connect();
    expect(connector.provider).toBe(provider);
  });

  it('releases provider and modal listeners after success', async () => {
    await makeConnector(wallet).connect();
    expect(eventListeners.size).toBe(0);
    expect(providerListeners.size).toBe(0);
  });

  it('releases provider and modal listeners after cancellation', async () => {
    spyOn(console, 'error').mockImplementation(() => {});
    isCancelled = true;
    await makeConnector(wallet).connect();
    expect(eventListeners.size).toBe(0);
    expect(providerListeners.size).toBe(0);
  });

  it('does not open a modal during automatic reconnection', async () => {
    const connector = makeConnector(wallet);
    await connector.autoConnect();
    expect(appKit.open).not.toHaveBeenCalled();
    expect(connector.provider).toBe(provider);
  });
});

it('restores a provider that is ready before subscribing', async () => {
  spyOn(console, 'error').mockImplementation(() => {});
  hasRestoredProvider = true;
  hasProviderUpdate = false;
  const connector = makeConnector(wallet);
  await connector.autoConnect();
  expect(connector.provider).toBe(provider);
  expect(appKit.open).not.toHaveBeenCalled();
  expect(eventListeners.size).toBe(0);
  expect(providerListeners.size).toBe(0);
}, 7000);

it('releases listeners after the automatic reconnection timeout', async () => {
  spyOn(console, 'error').mockImplementation(() => {});
  hasProviderUpdate = false;
  const connector = makeConnector(wallet);
  await connector.autoConnect();
  expect(connector.provider).toBeUndefined();
  expect(eventListeners.size).toBe(0);
  expect(providerListeners.size).toBe(0);
}, 7000);

it('clears the automatic reconnection timer after success', async () => {
  const schedule = spyOn(globalThis, 'setTimeout');
  const cancel = spyOn(globalThis, 'clearTimeout');
  await makeConnector(wallet).autoConnect();
  const index = schedule.mock.calls.findIndex(([, delay]) => delay === 5000);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(cancel).toHaveBeenCalledWith(schedule.mock.results[index].value);
});
