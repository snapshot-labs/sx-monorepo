import { FunctionalComponent } from 'vue';
import { SellOrder } from '@/helpers/auction';
import ICFarcaster from '~icons/c/farcaster';
import ICLens from '~icons/c/lens';
import ICX from '~icons/c/x';

type SocialNetwork = 'x' | 'lens' | 'farcaster';

export type PayloadType = 'bid';
export type Payload = SellOrder;

const SOCIAL_NETWORKS: {
  id: SocialNetwork;
  name: string;
  icon: FunctionalComponent;
}[] = [
  { id: 'x', name: 'X', icon: ICX },
  { id: 'lens', name: 'Lens', icon: ICLens },
  { id: 'farcaster', name: 'Farcaster', icon: ICFarcaster }
];

export function useSharing() {
  function getBidMessage(sellOrder: SellOrder): string {
    return `Just joined the $${sellOrder.auction.symbolAuctioningToken} auction with a bid!`;
  }

  function getShareUrl(
    socialNetwork: SocialNetwork,
    _type: PayloadType,
    payload: Payload
  ): string {
    const message = encodeURIComponent(getBidMessage(payload));

    switch (socialNetwork) {
      case 'x':
        return `https://x.com/intent/post/?text=${message}`;
      case 'lens':
        return `https://hey.xyz/?text=${message}`;
      case 'farcaster':
        return `https://warpcast.com/~/compose?text=${message}`;
      default:
        throw new Error('Invalid network');
    }
  }

  return {
    SOCIAL_NETWORKS,
    getShareUrl
  };
}
