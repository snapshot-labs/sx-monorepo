import { Response } from 'express';

export const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'pineapple.fyi';

export function getUrl(uri: string, gateway = IPFS_GATEWAY) {
  const ipfsGateway = `https://${gateway}`;
  if (!uri) return null;
  if (
    !uri.startsWith('ipfs://') &&
    !uri.startsWith('ipns://') &&
    !uri.startsWith('https://') &&
    !uri.startsWith('http://')
  )
    return `${ipfsGateway}/ipfs/${uri}`;
  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs')
    return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns')
    return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  return uri;
}

export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) return null;

  return fetch(url).then(res => res.json());
}

export function rpcSuccess(res: Response, result: any, id: number | null) {
  return res.json({ jsonrpc: '2.0', result, id });
}

export function rpcError(
  res: Response,
  status: number,
  code: number,
  message: unknown,
  id: number | null
) {
  return res.status(status).json({
    jsonrpc: '2.0',
    error: { code, message },
    id
  });
}

export async function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
