import {
  concat,
  createPublicClient,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  formatUnits,
  getAddress,
  Hex,
  http,
  parseAbi,
  size,
  zeroAddress
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import Schnaps from '../src/abis/Schnaps';
import { createConfig } from '../src/config';
import tokens from '../src/payment_tokens.json';

// Queues one transaction per network in the Safe that owns Schnaps, to
// withdraw every balance to RECIPIENT. Prints the plan by default, `--propose`
// adds it to the Safe queue. Owners still review and sign in the Safe app.

const RECIPIENT = '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c';
const NETWORKS = ['eth', 'base'] as const;
// Safe v1.4.1 MultiSendCallOnly, same address on every network
const MULTI_SEND = '0x9641d764fc13c8B624c04430C7356C1C7C8102e2';
const SAFE_ABI = parseAbi([
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function multiSend(bytes transactions) payable'
]);

const isProposing = process.argv.includes('--propose');
const headers = {
  'Content-Type': 'application/json',
  ...(process.env.SAFE_API_KEY && {
    Authorization: `Bearer ${process.env.SAFE_API_KEY}`
  })
};

async function withdraw(network: (typeof NETWORKS)[number]) {
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
  if (!isProposing) return;

  const api = `https://api.safe.global/tx-service/${network}/api/v2/safes/${safe}/multisig-transactions/`;
  const nonce = await client.readContract({
    address: safe,
    abi: SAFE_ABI,
    functionName: 'nonce'
  });
  const res = await fetch(`${api}?executed=false&nonce__gte=${nonce}`, {
    headers
  });
  if (!res.ok) throw new Error(`Safe queue: ${res.status} ${await res.text()}`);
  const queue: { nonce: string; to: string; data: string | null }[] = (
    await res.json()
  ).results;
  const needle = schnaps.slice(2).toLowerCase();
  if (queue.some(tx => `${tx.to}${tx.data}`.toLowerCase().includes(needle))) {
    return console.log(`${network}: a Schnaps transaction is already queued`);
  }

  const tx = {
    to: calls.length === 1 ? schnaps : MULTI_SEND,
    value: '0',
    data:
      calls.length === 1
        ? calls[0]
        : encodeFunctionData({
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
    // MultiSendCallOnly has to be delegate called
    operation: calls.length === 1 ? 0 : 1,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: Math.max(Number(nonce), ...queue.map(tx => Number(tx.nonce) + 1))
  };
  const contractTransactionHash = await client.readContract({
    address: safe,
    abi: SAFE_ABI,
    functionName: 'getTransactionHash',
    args: [
      tx.to,
      0n,
      tx.data,
      tx.operation,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      BigInt(tx.nonce)
    ]
  });
  const account = privateKeyToAccount(process.env.SAFE_PROPOSER_KEY as Hex);
  const post = await fetch(api, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...tx,
      contractTransactionHash,
      sender: account.address,
      signature: await account.sign({ hash: contractTransactionHash })
    })
  });
  if (!post.ok) throw new Error(`Safe: ${post.status} ${await post.text()}`);
  console.log(
    `${network}: queued with nonce ${tx.nonce}, https://app.safe.global/transactions/queue?safe=${network}:${safe}`
  );
}

async function main() {
  for (const network of NETWORKS) await withdraw(network);
}

main();
