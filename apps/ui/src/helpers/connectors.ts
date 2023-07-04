import { getUrl } from '@/helpers/utils';
import metamaskIcon from '@/assets/connectors/metamask.png';
import walletconnectIcon from '@/assets/connectors/walletconnect.png';
import coinbaseIcon from '@/assets/connectors/coinbase.png';
import portisIcon from '@/assets/connectors/portis.png';
import gnosisIcon from '@/assets/connectors/gnosis.png';
import argentxIcon from '@/assets/connectors/argentx.png';

export default {
  injected: {
    id: 'injected',
    name: 'MetaMask',
    type: 'injected',
    root: 'ethereum',
    icon: metamaskIcon
  },
  walletconnect: {
    id: 'walletconnect',
    name: 'WalletConnect',
    network: '1',
    icon: walletconnectIcon,
    options: {
      projectId: 'e6454bd61aba40b786e866a69bd4c5c6',
      chains: [5],
      optionalChains: [1, 11155111],
      methods: ['eth_sendTransaction', 'eth_signTypedData_v4'],
      showQrModal: true
    }
  },
  walletlink: {
    id: 'walletlink',
    name: 'Coinbase',
    network: '1',
    icon: coinbaseIcon,
    options: {
      appName: 'Snapshot',
      darkMode: false,
      chainId: 1,
      ethJsonrpcUrl: 'https://cloudflare-eth.com'
    }
  },
  portis: {
    id: 'portis',
    name: 'Portis',
    network: '1',
    icon: portisIcon,
    options: {
      dappId: '3eb93706-c71d-456b-b4eb-322ea27f7d48',
      network: 'mainnet'
    }
  },
  gnosis: {
    id: 'gnosis',
    type: 'gnosis',
    name: 'Gnosis Safe',
    icon: gnosisIcon
  },
  argentx: {
    id: 'argentx',
    name: 'Argent X',
    type: 'injected',
    root: 'starknet',
    icon: argentxIcon
  }
};

export function mapConnectorId(sourceName: string) {
  if (sourceName === 'metamask') return 'injected';
  if (sourceName === 'coinbase') return 'walletlink';

  return sourceName;
}

export function getConnectorIconUrl(url) {
  if (url.startsWith('ipfs://')) return getUrl(url);

  return url;
}
