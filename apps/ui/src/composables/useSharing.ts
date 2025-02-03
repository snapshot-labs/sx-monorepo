import { FunctionalComponent } from 'vue';
import { getChoiceText, whiteLabelAwareParams } from '@/helpers/utils';
import { Choice, Proposal, Space, User } from '@/types';
import ICFarcaster from '~icons/c/farcaster';
import ICLens from '~icons/c/lens';
import ICX from '~icons/c/x';

type SocialNetwork = 'x' | 'lens' | 'farcaster';
type SpaceUser = { user: User; space: Space };
export type Vote = { proposal: Proposal; choice: Choice };

export type PayloadType = 'proposal' | 'user' | 'space-user' | 'vote';
export type Payload = Proposal | User | SpaceUser | Vote;

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
  const router = useRouter();
  const { app } = useApp();
  const { isWhiteLabel } = useWhiteLabel();

  function getProposalUrl(proposal: Proposal): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'space-proposal',
        params: whiteLabelAwareParams(isWhiteLabel.value, {
          space: `${proposal.network}:${proposal.space.id}`,
          proposal: proposal.proposal_id
        })
      }).href
    }`;
  }

  function getUserUrl(user: User): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'user',
        params: whiteLabelAwareParams(isWhiteLabel.value, {
          user: user.id
        })
      }).href
    }`;
  }

  function getSpaceUserUrl(spaceUser: SpaceUser): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'space-user',
        params: whiteLabelAwareParams(isWhiteLabel.value, {
          space: `${spaceUser.space.network}:${spaceUser.space.id}`,
          user: spaceUser.user.id
        })
      }).href
    }`;
  }

  function getMessage(type: PayloadType, payload: Payload): string {
    switch (type) {
      case 'user':
        return getUserMessage(payload as User);
      case 'space-user':
        return getSpaceUserMessage(payload as SpaceUser);
      case 'proposal':
        return getProposalMessage(payload as Proposal);
      case 'vote':
        return getVoteMessage(payload as Vote);
      default:
        throw new Error('Invalid shareable object');
    }
  }

  function getProposalMessage(proposal: Proposal): string {
    return `${proposal.space.name}: ${proposal.title} ${getProposalUrl(proposal)}`;
  }

  function getUserMessage(user: User): string {
    return getUserUrl(user);
  }

  function getSpaceUserMessage(spaceUser: SpaceUser): string {
    return getSpaceUserUrl(spaceUser);
  }

  function getVoteMessage(payload: Vote) {
    const { proposal, choice } = payload;
    const choiceText = getChoiceText(proposal.choices, choice);
    const isSingleChoice =
      proposal.type === 'single-choice' || proposal.type === 'basic';
    const hasPrivacy = proposal.privacy === 'shutter';
    const votedText =
      isSingleChoice && !hasPrivacy
        ? `I just voted "${choiceText}"`
        : `I just voted`;

    return `${votedText} on "${proposal.title}" ${getProposalUrl(proposal)}`;
  }

  function getShareUrl(
    socialNetwork: SocialNetwork,
    type: PayloadType,
    payload: Payload
  ): string {
    let message = encodeURIComponent(getMessage(type, payload));

    if (type === 'vote' && socialNetwork === 'x') {
      message += `%20%23${app.value.app_name}`;
    } else if (socialNetwork === 'lens') {
      message += `&hashtags=${app.value.app_name}`;
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
