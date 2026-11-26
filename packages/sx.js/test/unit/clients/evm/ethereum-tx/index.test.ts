import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { VoidSigner } from '@ethersproject/abstract-signer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EthSigAuthenticatorAbi from '../../../../../src/authenticators/evm/abis/EthSigAuthenticator.json';
import SpaceAbi from '../../../../../src/clients/evm/ethereum-tx/abis/Space.json';
import { EthereumTx } from '../../../../../src/clients/evm/ethereum-tx';
import { evmSepolia } from '../../../../../src/evmNetworks';

const SPACE = '0x0000000000000000000000000000000000000001';
const AUTHOR = '0x537f1896541d28F4c70116EEa602b1B34Da95163';
const ORACLE_STRATEGY = '0x59db2D5A9dC316bdc8015172Cf80891d95E2D201';
const SIGNATURE = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b`;
// The oracle attestation the author signed, as the strategy params of the gasless message
const SIGNED_PARAMS = defaultAbiCoder.encode(
  ['uint256', 'bytes'],
  [42, '0xabcdef']
);
const oracleStrategyConfig = {
  index: 0,
  address: ORACLE_STRATEGY,
  params: '0x',
  // A relayer must never fetch this URL
  metadata: { url: 'http://169.254.169.254/latest' }
};

// Captures the relayed transaction instead of sending it
class CaptureSigner extends VoidSigner {
  sent: any[] = [];
  async sendTransaction(tx: any): Promise<any> {
    this.sent.push(tx);
    return { hash: '0x', wait: async () => ({}) };
  }
}

function innerCall(tx: any, functionName: 'propose' | 'vote') {
  const authenticate = new Interface(EthSigAuthenticatorAbi).decodeFunctionData(
    'authenticate',
    tx.data
  );
  const [selector, calldata] = authenticate.slice(-2);
  return new Interface(SpaceAbi).decodeFunctionData(
    functionName,
    `${selector}${calldata.slice(2)}`
  );
}

describe('EthereumTx relaying a gasless message', () => {
  const client = new EthereumTx({
    networkConfig: evmSepolia,
    whitelistServerUrl: '',
    provider: {} as any
  });
  const authenticator = evmSepolia.authenticators
    ? Object.keys(evmSepolia.authenticators).find(
        a => evmSepolia.authenticators[a]?.type === 'ethSig'
      )!
    : '';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send the proposal validation params the author signed, without fetching them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const signer = new CaptureSigner(AUTHOR);
    const userProposalValidationParams = `0x${'00'.repeat(31)}05`;

    await client.propose({
      signer,
      envelope: {
        data: {
          space: SPACE,
          authenticator,
          strategies: [oracleStrategyConfig],
          executionStrategy: { addr: SPACE, params: '0x' },
          metadataUri: 'ipfs://x',
          blockNumber: 12_000_000
        },
        signatureData: {
          address: AUTHOR,
          signature: SIGNATURE,
          domain: {},
          types: {},
          message: { salt: 1, userProposalValidationParams }
        }
      }
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(innerCall(signer.sent[0], 'propose')[3]).toBe(
      userProposalValidationParams
    );
  });

  it('should never fetch for a signed message that leaves its params out', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.vote({
        signer: new CaptureSigner(AUTHOR),
        envelope: {
          data: {
            space: SPACE,
            authenticator,
            strategies: [oracleStrategyConfig],
            proposal: 1,
            choice: 1,
            metadataUri: ''
          },
          signatureData: {
            address: AUTHOR,
            signature: SIGNATURE,
            domain: {},
            types: {},
            message: { salt: 1 }
          }
        }
      })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should send the voting strategy params the voter signed, without fetching them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const signer = new CaptureSigner(AUTHOR);

    await client.vote({
      signer,
      envelope: {
        data: {
          space: SPACE,
          authenticator,
          strategies: [oracleStrategyConfig],
          proposal: 1,
          choice: 1,
          metadataUri: ''
        },
        signatureData: {
          address: AUTHOR,
          signature: SIGNATURE,
          domain: {},
          types: {},
          message: {
            salt: 1,
            userVotingStrategies: [{ index: 0, params: SIGNED_PARAMS }]
          }
        }
      }
    });

    expect(fetchMock).not.toHaveBeenCalled();
    const [, , , userVotingStrategies] = innerCall(signer.sent[0], 'vote');
    expect(userVotingStrategies.map((s: any) => [s.index, s.params])).toEqual([
      [0, SIGNED_PARAMS]
    ]);
  });
});
