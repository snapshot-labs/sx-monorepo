import { getChoiceText } from '@/helpers/utils';
import ICX from '~icons/c/x';
import ICLens from '~icons/c/lens';
import ICFarcaster from '~icons/c/farcaster';
import type { Choice, Proposal } from '@/types';

const HASH_TAG = 'Snapshot';

export function useSharing() {
  const socialNetworks = [
    { id: 'x', name: 'X', icon: ICX },
    { id: 'lens', name: 'Hey', icon: ICLens },
    { id: 'farcaster', name: 'Warpcast', icon: ICFarcaster }
  ];

  function getProposalUrl(proposal: Proposal) {
    return `https://${window.location.hostname}/#/${proposal.network}:${proposal.space.id}/proposal/${proposal.proposal_id}`;
  }

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
    const choiceText = getChoiceText(proposal.choices, choice);
    const isSingleChoice = proposal.type === 'single-choice' || proposal.type === 'basic';
    const isPrivate = proposal.privacy === 'shutter';
    const votedText =
      isSingleChoice && !isPrivate ? `I just voted "${choiceText}" on` : `I just voted on`;

    return `${encodeURIComponent(votedText)}%20"${encodeURIComponent(
      proposal.title
    )}"%20${encodeURIComponent(getProposalUrl(proposal))}`;
  }

  function getUserMessage() {
    return encodeURIComponent(window.location.href);
  }

  function getProposalMessage(proposal: Proposal) {
    return encodeURIComponent(
      `${proposal.space.name}: ${proposal.title} ${getProposalUrl(proposal)}`
    );
  }

  function share(socialNetwork: string, type: string, payload: any) {
    let message = getMessage(type, payload);
    if (type === 'vote' && socialNetwork === 'x') {
      message += `%20%23${HASH_TAG}`;
    } else if (socialNetwork === 'lens') {
      message += `&hashtags=${HASH_TAG}`;
    }

    let url: string;

    switch (socialNetwork) {
      case 'x':
        url = `https://twitter.com/intent/tweet/?text=${message}`;
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

    return window.open(url, '_blank')?.focus();
  }

  return {
    socialNetworks,
    share
  };
}
