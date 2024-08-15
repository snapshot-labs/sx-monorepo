import { FunctionalComponent } from 'vue';
import { Proposal, User } from '@/types';
import ICFarcaster from '~icons/c/farcaster';
import ICLens from '~icons/c/lens';
import ICX from '~icons/c/x';

export type ShareableType = 'proposal' | 'user';
type SocialNetwork = 'x' | 'lens' | 'farcaster';

const HASH_TAG = 'Snapshot';

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
  function getProposalUrl(proposal: Proposal): string {
    return `https://${window.location.hostname}/#/${proposal.network}:${proposal.space.id}/proposal/${proposal.proposal_id}`;
  }

  function getMessage(type: ShareableType, payload: User | Proposal): string {
    switch (type) {
      case 'user':
        return getUserMessage();
      case 'proposal':
        return getProposalMessage(payload as Proposal);
      default:
        throw new Error('Invalid shareable object');
    }
  }

  function getUserMessage(): string {
    return encodeURIComponent(window.location.href);
  }

  function getProposalMessage(proposal: Proposal): string {
    return encodeURIComponent(
      `${proposal.space.name}: ${proposal.title} ${getProposalUrl(proposal)}`
    );
  }

  function getShareUrl(
    socialNetwork: SocialNetwork,
    type: ShareableType,
    payload: User | Proposal
  ): string {
    let message = getMessage(type, payload);

    if (socialNetwork === 'lens') {
      message += `&hashtags=${HASH_TAG}`;
    }

    let url: string;

    switch (socialNetwork) {
      case 'x':
        url = `https://x.com/intent/post/?text=${message}`;
        break;
      case 'lens':
        url = `https://hey.xyz/?text=${message}`;
        break;
      case 'farcaster':
        url = `https://warpcast.com/~/compose?text=${message}`;
        break;
      default:
        throw new Error('Invalid network');
    }

    return url;
  }

  return {
    SOCIAL_NETWORKS,
    getShareUrl
  };
}
