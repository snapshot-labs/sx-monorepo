import { Transaction } from '@/types';

const TENDERLY_ACCESS_KEY = import.meta.env.VITE_TENDERLY_ACCESS_KEY;

export async function simulate(chainId: number, from: string, txs: Transaction[]) {
  const url = 'https://api.tenderly.co/api/v1/account/me/project/project/simulate-batch';

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
        value: tx.value
      }))
    })
  };

  try {
    const res = await fetch(url, init);
    const data = await res.json();

    return !data.simulation_results.find(result => result.transaction.status === false);
  } catch (e) {
    return false;
  }
}
