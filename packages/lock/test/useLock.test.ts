import { expect, it, mock } from 'bun:test';
import Connector from '../src/connectors/connector';
import { ConnectorType } from '../src/types';

mock.module('../src/eip6963', () => ({
  default: class {
    providerDetails = new Map();
    subscribe() {}
    requestProviders() {}
  }
}));
mock.module('../src/connectors', () => ({
  default: { walletconnect: Connector, guest: Connector, injected: Connector }
}));
const { useLock } = await import('../src/vue/useLock');
const details = {
  injected: {},
  walletconnect: { info: { name: 'WalletConnect' } },
  guest: { info: { name: 'Guest' } }
};

it('preserves a single connector and its default identity', () => {
  const { connectors } = useLock(details as Record<ConnectorType, object>);
  expect(connectors.value.map(connector => connector.id)).toEqual([
    'walletconnect',
    'guest'
  ]);
});

it('creates named choices with the same connector type and distinct identities', () => {
  const options = { wallet: { id: 'native-wallet' } };
  const { connectors } = useLock({
    ...details,
    walletconnect: [
      { id: 'native-wallet', info: { name: 'Native wallet' }, options },
      details.walletconnect
    ]
  } as Record<ConnectorType, object>);
  expect(
    connectors.value.map(connector => [connector.id, connector.type])
  ).toEqual([
    ['native-wallet', 'walletconnect'],
    ['walletconnect', 'walletconnect'],
    ['guest', 'guest']
  ]);
  expect(connectors.value[0].options).toBe(options);
  expect(connectors.value[0].autoConnectOnly).toBe(false);
});
