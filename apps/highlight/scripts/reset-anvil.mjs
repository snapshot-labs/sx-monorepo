import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ANVIL_URL = process.env.NETWORK_NODE_URL || 'http://127.0.0.1:8545';
const FORK_URL = process.env.ANVIL_FORK_URL || 'https://rpc.snapshot.org/8453';

// Poster wallet address derived from WALLET_SECRET in mana
const POSTER_WALLET = '0xDE59CBa61faFBDb557De255eC6FB90182C7b488B';

async function rpc(method, params = []) {
  const res = await fetch(ANVIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  });
  return (await res.json()).result;
}

try {
  await rpc('anvil_reset', [{ forking: { jsonRpcUrl: FORK_URL } }]);
  const blockNum = parseInt(await rpc('eth_blockNumber'), 16);
  console.log(`Anvil reset to block ${blockNum}`);

  // Fund the poster wallet with 10 ETH
  await rpc('anvil_setBalance', [
    POSTER_WALLET,
    '0x8AC7230489E80000' // 10 ETH
  ]);
  console.log(`Funded ${POSTER_WALLET} with 10 ETH`);

  // Write the start block so the indexer knows where to begin
  const stateFile = join(__dirname, '..', '.anvil-start-block');
  writeFileSync(stateFile, blockNum.toString());
  console.log(`Wrote start block ${blockNum} to .anvil-start-block`);
} catch (err) {
  console.log('Anvil reset skipped:', err.message);
}
