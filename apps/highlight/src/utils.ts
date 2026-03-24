export const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'pineapple.fyi';
export const SWARM_GATEWAY =
  process.env.SWARM_GATEWAY || 'api.gateway.ethswarm.org/bzz';

export function getUrl(uri: string, gateway = IPFS_GATEWAY) {
  const ipfsGateway = `https://${gateway}`;
  if (!uri) return null;
  if (
    !uri.startsWith('ipfs://') &&
    !uri.startsWith('ipns://') &&
    !uri.startsWith('swarm://') &&
    !uri.startsWith('https://') &&
    !uri.startsWith('http://')
  )
    return `${ipfsGateway}/ipfs/${uri}`;
  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs')
    return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns')
    return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  if (uriScheme === 'swarm')
    return uri.replace('swarm://', `https://${SWARM_GATEWAY}/`);
  return uri;
}

export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
