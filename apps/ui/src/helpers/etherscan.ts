export async function getABI(address: string) {
  const uri = 'https://api-goerli.etherscan.io/api';
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getAbi',
    address
  });

  const res = await fetch(`${uri}?${params}`);
  const { result } = await res.json();

  return JSON.parse(result);
}
