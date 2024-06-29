import ICX from '~icons/c/x';
import ICLens from '~icons/c/lens';
import ICFarcaster from '~icons/c/farcaster';

export function useSharing() {
  const socialNetworks = [
    { id: 'x', name: 'X', icon: ICX },
    { id: 'lens', name: 'Hey', icon: ICLens },
    { id: 'farcaster', name: 'Warpcast', icon: ICFarcaster }
  ];

  function shareMessage(network: string, message: string) {
    let url: string;

    switch (network) {
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
    shareMessage
  };
}
