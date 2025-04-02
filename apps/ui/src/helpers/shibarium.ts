export type ShibariumChainId = '109' | '157';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function getSpaceController(
  name: string,
  chainId: ShibariumChainId
) {
  const response = await fetch(
    `https://bens.services.blockscout.com/api/v1/${chainId}/domains:lookup?name=${name}&only_active=true`,
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  if (!response.ok) {
    throw new Error(
      `Shibarium API error: [${response.status}] ${response.statusText}`
    );
  }
  const data = await response.json();

  return data.items[0]?.owner?.hash || EMPTY_ADDRESS;
}
