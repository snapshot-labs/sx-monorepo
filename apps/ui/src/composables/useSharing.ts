import ICX from '~icons/c/x';
import ICLens from '~icons/c/lens';
import ICFarcaster from '~icons/c/farcaster';
import type { Choice, Proposal } from '@/types';

export function useSharing() {
  const socialNetworks = [
    { id: 'x', name: 'X', icon: ICX },
    { id: 'lens', name: 'Hey', icon: ICLens },
    { id: 'farcaster', name: 'Warpcast', icon: ICFarcaster }
  ];

  const route = useRoute();

  function getMessage(type: string, payload: any) {
    switch (type) {
      case 'user':
        return getUserMessage();
      case 'proposal':
        return getProposalMessage(payload as Proposal);
      case 'vote':
        return getVoteMessage(payload.proposal, payload.choice);
      default:
        throw new Error('Invalid shareable object');
    }
  }

  function getVoteMessage(proposal: Proposal, choice: Choice) {
    return '';
  }

  function getUserMessage() {
    return encodeURIComponent(window.location.href);
  }

  function getProposalMessage(proposal: Proposal) {
    const currentUrl = `${window.location.origin}/#${route.path}`;
    return encodeURIComponent(`${proposal.space.name}: ${proposal.title} ${currentUrl}`);
  }

  function share(socialNetwork: string, type: string, payload: any) {
    const message = getMessage(type, payload);
    let url: string;

    switch (socialNetwork) {
      case 'x':
        url = `https://twitter.com/intent/tweet/?text=${message}`;
        break;
      case 'lens':
        url = `https://hey.xyz/?hashtags=Snapshot&text=${message}`;
        break;
      case 'farcaster':
        url = `https://warpcast.com/~/compose?text=${message}`;
        break;
      default:
        throw new Error('Invalid network');
    }

    return window.open(url, '_blank')?.focus();
  }

  return {
    socialNetworks,
    share
  };
}
