import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(process.env.PINATA_API_KEY || '', process.env.PINATA_SECRET_API_KEY || '');

export async function set(json) {
  const result = await pinata.pinJSONToIPFS(json);
  return result.IpfsHash;
}
