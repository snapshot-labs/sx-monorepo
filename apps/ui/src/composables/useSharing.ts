import { FunctionalComponent } from 'vue';
import { Proposal, Space, User } from '@/types';
import ICFarcaster from '~icons/c/farcaster';
import ICLens from '~icons/c/lens';
import ICX from '~icons/c/x';

type SpaceUser = { user: User; space: Space };
type SocialNetwork = 'x' | 'lens' | 'farcaster';

export type ShareableType = 'proposal' | 'user' | 'space-user';
export type PayloadType = User | Proposal | SpaceUser;

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
  const router = useRouter();

  function getProposalUrl(proposal: Proposal): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'proposal',
        params: {
          space: `${proposal.network}:${proposal.space.id}`,
          id: proposal.proposal_id
        }
      }).href
    }`;
  }

  function getUserUrl(user: User): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'user',
        params: {
          id: user.id
        }
      }).href
    }`;
  }

  function getSpaceUserUrl(spaceUser: SpaceUser): string {
    return `${window.location.origin}/${
      router.resolve({
        name: 'space-user',
        params: {
          id: `${spaceUser.space.network}:${spaceUser.space.id}`,
          user: spaceUser.user.id
        }
      }).href
    }`;
  }

  function getMessage(type: ShareableType, payload: PayloadType): string {
    switch (type) {
      case 'user':
        return getUserMessage(payload as User);
      case 'space-user':
        return getSpaceUserMessage(payload as SpaceUser);
      case 'proposal':
        return getProposalMessage(payload as Proposal);
      default:
        throw new Error('Invalid shareable object');
    }
  }

  function getUserMessage(user: User): string {
    return getUserUrl(user);
  }

  function getSpaceUserMessage(spaceUser: SpaceUser): string {
    return getSpaceUserUrl(spaceUser);
  }

  function getProposalMessage(proposal: Proposal): string {
    return `${proposal.space.name}: ${proposal.title} ${getProposalUrl(proposal)}`;
  }

  function getShareUrl(
    socialNetwork: SocialNetwork,
    type: ShareableType,
    payload: PayloadType
  ): string {
    let message = encodeURIComponent(getMessage(type, payload));

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
