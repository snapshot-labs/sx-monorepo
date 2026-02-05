import { Transaction } from '@/types';

const TENDERLY_ACCESS_KEY =
  import.meta.env.VITE_TENDERLY_ACCESS_KEY ||
  'wgwjB9fRCfVf2PMty9Eqid7oWgpmirrF';
const TENDERLY_PROJECT_SLUG =
  import.meta.env.VITE_TENDERLY_PROJECT_SLUG || 'snapshot';
const TENDERLY_ACCOUNT_ID =
  import.meta.env.VITE_TENDERLY_ACCOUNT_ID || 'snapshot-labs';

export async function simulate(
  chainId: number,
  from: string,
  txs: Transaction[]
) {
  const url = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_ID}/project/${TENDERLY_PROJECT_SLUG}/simulate-bundle`;

  const init = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Access-Key': TENDERLY_ACCESS_KEY
    },
    body: JSON.stringify({
      simulations: txs.map(tx => ({
        network_id: chainId,
        from,
        to: tx.to,
        input: tx.data,
        gas_price: '0',
        value: tx.value,
        save: true
      }))
    })
  };

  try {
    const res = await fetch(url, init);
    const data = await res.json();

    return !data.simulation_results.find(
      result => result.transaction.status === false
    );
  } catch {
    return false;
  }
}
