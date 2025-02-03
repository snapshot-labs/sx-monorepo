import { isAddress } from '@ethersproject/address';

const EFP_API_URL = 'https://api.ethfollow.xyz';

export async function getUserStats(
  addressOrENS: string
): Promise<{ followers_count: number; following_count: number }> {
  if (!isAddress(addressOrENS)) return Promise.reject('Invalid address');

  const res = await fetch(`${EFP_API_URL}/api/v1/users/${addressOrENS}/stats`);
  const stats = await res.json();

  return {
    followers_count: parseInt(stats.followers_count),
    following_count: parseInt(stats.following_count)
  };
}
