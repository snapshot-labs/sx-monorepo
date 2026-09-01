import { Interface } from '@ethersproject/abi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWalletConnect as UseWalletConnect } from './useWalletConnect';

type Listener = (payload?: unknown) => void;

class MockConnector {
  private listeners: Record<string, Set<Listener>> = {};

  core = { pairing: { pair: vi.fn(async () => {}) } };

  disconnectSession = vi.fn(async () => {});

  approveSession = vi.fn(async ({ id }: { id: number }) => ({
    topic: `topic-${id}`
  }));

  rejectSession = vi.fn(async () => {});

  emitSessionEvent = vi.fn(async () => {});

  respondSessionRequest = vi.fn(async () => {});

  on(event: string, listener: Listener) {
    (this.listeners[event] ??= new Set()).add(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners[event]?.delete(listener);
    return this;
  }

  emit(event: string, payload?: unknown) {
    this.listeners[event]?.forEach(listener => listener(payload));
  }

  listenerCount(event: string) {
    return this.listeners[event]?.size ?? 0;
  }
}

let createdConnectors: MockConnector[] = [];

vi.mock('@reown/walletkit', () => ({
  WalletKit: {
    init: vi.fn(async () => {
      const connector = new MockConnector();
      createdConnectors.push(connector);
      return connector;
    })
  }
}));

vi.mock('@walletconnect/core', () => ({
  Core: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('@walletconnect/utils', () => ({
  buildApprovedNamespaces: vi.fn(() => ({})),
  getSdkError: vi.fn((code: string) => ({ code }))
}));

vi.mock('@/helpers/etherscan', () => ({
  getABI: vi.fn(async () => ['function transfer(address to, uint256 amount)'])
}));

const PROPOSAL_FIXTURE = {
  requiredNamespaces: {},
  optionalNamespaces: {}
};

const TRANSFER_ABI = ['function transfer(address to, uint256 amount)'];

function buildEthSendTransactionRequest(topic: string, id: number) {
  const iface = new Interface(TRANSFER_ABI);
  const data = iface.encodeFunctionData('transfer', [
    '0x000000000000000000000000000000000000dEaD',
    '1000'
  ]);

  return {
    topic,
    id,
    params: {
      request: {
        method: 'eth_sendTransaction',
        params: [
          {
            to: '0x000000000000000000000000000000000000cAfe',
            data,
            value: '0x0'
          }
        ]
      }
    }
  };
}

let useWalletConnect: typeof UseWalletConnect;

beforeEach(async () => {
  vi.resetModules();
  createdConnectors = [];
  ({ useWalletConnect } = await import('./useWalletConnect'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function connectAndApprove(
  composable: ReturnType<typeof useWalletConnect>,
  uri: string,
  proposalId: number
) {
  await composable.connect(uri, async () => true);
  const connector = createdConnectors[createdConnectors.length - 1];
  connector.emit('session_proposal', {
    id: proposalId,
    params: PROPOSAL_FIXTURE
  });
  await vi.waitFor(() => expect(composable.logged.value).toBe(true));
  return connector;
}

describe('useWalletConnect', () => {
  it('disconnects a different space treasury session and replaces its listeners when a new one connects', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const spaceB = useWalletConnect('eth', 1, '0xBBB', 'space-b', null);

    const connector = await connectAndApprove(spaceA, 'uri-a', 1);
    expect(connector.listenerCount('session_request')).toBe(1);

    await connectAndApprove(spaceB, 'uri-b', 2);

    expect(connector.disconnectSession).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'topic-1' })
    );
    expect(spaceA.logged.value).toBe(false);
    expect(spaceB.logged.value).toBe(true);

    expect(connector.listenerCount('session_proposal')).toBe(1);
    expect(connector.listenerCount('session_request')).toBe(1);
    expect(connector.listenerCount('session_delete')).toBe(1);
  });

  it('removes its listeners on explicit logout instead of leaving them registered', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    expect(connector.listenerCount('session_request')).toBe(1);

    await spaceA.logout();

    expect(connector.listenerCount('session_proposal')).toBe(0);
    expect(connector.listenerCount('session_request')).toBe(0);
    expect(connector.listenerCount('session_delete')).toBe(0);
    expect(spaceA.logged.value).toBe(false);
  });

  it('ignores an otherwise-valid session_request whose topic is not the active session', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    connector.emit(
      'session_request',
      buildEthSendTransactionRequest('some-other-topic', 99)
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(connector.respondSessionRequest).not.toHaveBeenCalled();
  });

  it('handles an incoming session_request that matches the active session topic', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    connector.emit(
      'session_request',
      buildEthSendTransactionRequest('topic-1', 100)
    );

    await vi.waitFor(() =>
      expect(connector.respondSessionRequest).toHaveBeenCalled()
    );
  });

  it('ignores a session_delete whose topic is not the active session', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    connector.emit('session_delete', { id: 1, topic: 'some-other-topic' });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(spaceA.logged.value).toBe(true);
  });

  it('clears the stored proposal state on a session_delete for its own topic', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    expect(spaceA.proposal.value).not.toBe(null);

    connector.emit('session_delete', { id: 1, topic: 'topic-1' });
    await vi.waitFor(() => expect(spaceA.logged.value).toBe(false));

    expect(spaceA.proposal.value).toBe(null);
  });

  it('clears the deleted session on session_delete so pairing a different treasury does not try to disconnect the removed session', async () => {
    const spaceA = useWalletConnect('eth', 1, '0xAAA', 'space-a', null);
    const spaceB = useWalletConnect('eth', 1, '0xBBB', 'space-b', null);
    const connector = await connectAndApprove(spaceA, 'uri-a', 1);

    connector.emit('session_delete', { id: 1, topic: 'topic-1' });
    await vi.waitFor(() => expect(spaceA.logged.value).toBe(false));

    connector.disconnectSession.mockClear();
    await connectAndApprove(spaceB, 'uri-b', 2);

    expect(connector.disconnectSession).not.toHaveBeenCalled();
    expect(spaceB.logged.value).toBe(true);
  });
});
