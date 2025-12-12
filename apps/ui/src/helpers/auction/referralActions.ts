import { Web3Provider } from '@ethersproject/providers';
import { executionCall } from '@/helpers/mana';
import { pin } from '@/helpers/pin';
import {
  AUCTION_TAG,
  CHAIN_ID,
  EIP712_DOMAIN,
  POSTER_TAG
} from './referral';

export async function setReferral(
  web3: Web3Provider,
  referee: string
): Promise<{ hash: string }> {
  const signer = web3.getSigner();
  const signerAddress = await signer.getAddress();

  const message = {
    auction_tag: AUCTION_TAG,
    referee: referee.toLowerCase()
  };

  const signature = await signer._signTypedData(
    EIP712_DOMAIN,
    {
      SetAuctionReferee: [
        { name: 'auction_tag', type: 'string' },
        { name: 'referee', type: 'address' }
      ]
    },
    message
  );

  const metadata = {
    method: 'SetAuctionReferee',
    signer: signerAddress.toLowerCase(),
    signature,
    domain: EIP712_DOMAIN,
    message
  };

  const { cid } = await pin(metadata);

  return executionCall('eth', CHAIN_ID, 'postReferral', {
    metadataUri: `ipfs://${cid}`,
    posterTag: POSTER_TAG
  });
}
