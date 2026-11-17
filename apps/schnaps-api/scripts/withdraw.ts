import SignClient from '@walletconnect/sign-client';
import QRCode from 'qrcode';
import {
  concat,
  createPublicClient,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  formatUnits,
  getAddress,
  getTypesForEIP712Domain,
  hashTypedData,
  Hex,
  http,
  parseAbi,
  parseAbiParameters,
  size,
  stringify,
  zeroAddress
} from 'viem';
import Schnaps from '../src/abis/Schnaps';
import { createConfig } from '../src/config';
import tokens from '../src/payment_tokens.json';

// Withdraws every Schnaps balance to RECIPIENT through the Safe that owns the
// contract. Prints the plan by default. With `--propose`, a Safe owner signs
// over WalletConnect and the transactions are added to the Safe queue.

const RECIPIENT = '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c';
// Safe v1.4.1 MultiSendCallOnly, same address on every network
const MULTI_SEND = '0x9641d764fc13c8B624c04430C7356C1C7C8102e2';
const SAFE_ABI = parseAbi([
  'function nonce() view returns (uint256)',
  'function multiSend(bytes transactions) payable'
]);
const SAFE_TX = parseAbiParameters(
  'address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 nonce'
);

async function build(network: 'eth' | 'base', chainId: number) {
  const config = createConfig(network);
  const schnaps = getAddress(config.sources![0].contract);
  const client = createPublicClient({
    transport: http(config.network_node_url)
  });
  const safe = await client.readContract({
    address: schnaps,
    abi: Schnaps,
    functionName: 'owner'
  });

  const calls: Hex[] = [];
  const amounts: string[] = [];
  const native = await client.getBalance({ address: schnaps });
  if (native) {
    amounts.push(`${formatUnits(native, 18)} ETH`);
    calls.push(
      encodeFunctionData({
        abi: Schnaps,
        functionName: 'withdrawNativeToken',
        args: [RECIPIENT, native]
      })
    );
  }
  for (const [address, symbol] of Object.entries(tokens[network] ?? {})) {
    const token = { address: getAddress(address), abi: erc20Abi };
    const balance = await client.readContract({
      ...token,
      functionName: 'balanceOf',
      args: [schnaps]
    });
    if (!balance) continue;
    const decimals = await client.readContract({
      ...token,
      functionName: 'decimals'
    });
    amounts.push(`${formatUnits(balance, decimals)} ${symbol}`);
    calls.push(
      encodeFunctionData({
        abi: Schnaps,
        functionName: 'withdrawERC20Token',
        args: [token.address, RECIPIENT, balance]
      })
    );
  }
  if (!calls.length) return console.log(`${network}: nothing to withdraw`);
  console.log(`${network}: ${amounts.join(', ')} to ${RECIPIENT}`);

  // Throws when a call would revert, e.g. the recipient cannot take ETH with
  // the 2,300 gas that withdrawNativeToken forwards.
  for (const data of calls) {
    await client.call({ account: safe, to: schnaps, data });
  }

  const api = `https://api.safe.global/tx-service/${network}/api/v2/safes/${safe}/multisig-transactions/`;
  const nonce = await client.readContract({
    address: safe,
    abi: SAFE_ABI,
    functionName: 'nonce'
  });
  const res = await fetch(`${api}?executed=false&nonce__gte=${nonce}`);
  if (!res.ok) throw new Error(`Safe queue: ${res.status} ${await res.text()}`);
  const queue: { nonce: string; to: string; data: string | null }[] = (
    await res.json()
  ).results;
  const needle = schnaps.slice(2).toLowerCase();
  if (queue.some(tx => `${tx.to}${tx.data}`.toLowerCase().includes(needle))) {
    return console.log(`${network}: a Schnaps transaction is already queued`);
  }

  return {
    network,
    api,
    typedData: {
      domain: { chainId, verifyingContract: safe },
      types: { SafeTx: SAFE_TX },
      primaryType: 'SafeTx',
      message: {
        to: MULTI_SEND,
        value: 0n,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'multiSend',
          args: [
            concat(
              calls.map(data =>
                encodePacked(
                  ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
                  [0, schnaps, 0n, BigInt(size(data)), data]
                )
              )
            )
          ]
        }),
        operation: 1, // MultiSendCallOnly has to be delegate called
        safeTxGas: 0n,
        baseGas: 0n,
        gasPrice: 0n,
        gasToken: zeroAddress,
        refundReceiver: zeroAddress,
        nonce: BigInt(
          Math.max(Number(nonce), ...queue.map(tx => Number(tx.nonce) + 1))
        )
      }
    } as const
  };
}

async function main() {
  const txs = [await build('eth', 1), await build('base', 8453)].filter(
    tx => !!tx
  );
  if (!txs.length || !process.argv.includes('--propose')) return;

  const wallet = await SignClient.init({
    projectId: 'e6454bd61aba40b786e866a69bd4c5c6',
    metadata: {
      name: 'Schnaps withdraw',
      description: 'Queues Schnaps withdrawals in the owner Safe',
      url: 'https://snapshot.box',
      icons: ['https://snapshot.box/favicon.svg']
    },
    storageOptions: { database: ':memory:' }
  });
  const { uri, approval } = await wallet.connect({
    optionalNamespaces: {
      eip155: {
        chains: txs.map(tx => `eip155:${tx.typedData.domain.chainId}`),
        methods: ['eth_signTypedData_v4'],
        events: []
      }
    }
  });
  console.log('Scan with the wallet of a Safe owner:');
  console.log(await QRCode.toString(uri!, { type: 'terminal', small: true }));
  const { topic, namespaces } = await approval();
  const sender = getAddress(namespaces.eip155.accounts[0].split(':')[2]);

  for (const { network, api, typedData } of txs) {
    const { chainId, verifyingContract } = typedData.domain;
    // Wallets need the domain type spelled out
    const types = {
      EIP712Domain: getTypesForEIP712Domain(typedData),
      SafeTx: SAFE_TX
    };
    console.log(`${network}: sign the request in your wallet (${sender})`);
    const signature = await wallet.request({
      topic,
      chainId: `eip155:${chainId}`,
      request: {
        method: 'eth_signTypedData_v4',
        params: [sender, stringify({ ...typedData, types })]
      }
    });
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stringify({
        ...typedData.message,
        contractTransactionHash: hashTypedData(typedData),
        sender,
        signature
      })
    });
    if (!res.ok) throw new Error(`Safe: ${res.status} ${await res.text()}`);
    console.log(
      `${network}: queued, https://app.safe.global/transactions/queue?safe=${network}:${verifyingContract}`
    );
  }
  await wallet.disconnect({ topic, reason: { code: 6000, message: 'Done' } });
}

main().then(() => process.exit());
