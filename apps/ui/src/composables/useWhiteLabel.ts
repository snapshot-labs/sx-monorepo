import { useQueryClient } from '@tanstack/vue-query';
import { getNetwork, metadataNetwork } from '@/networks';
import { NetworkID, SkinSettings, Space } from '@/types';

type WhiteLabelConfig = {
  network?: NetworkID;
  id?: string;
  skinSettings?: SkinSettings;
};

// List of global paths, that should not be nested inside space scope
// when redirecting from whitelabel to main app
const GLOBAL_PATHS = { contacts: 'settings/contacts' };
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const WHITELABEL_MAPPING = import.meta.env.VITE_WHITELABEL_MAPPING;
const domain = window.location.hostname;

// Whitelabel mappings for onchain spaces.
// Override locally with VITE_WHITELABEL_MAPPING env var for easier testing
// e.g. VITE_WHITELABEL_MAPPING='localhost;s:snapshot.eth'
// e.g. VITE_WHITELABEL_MAPPING='localhost' (org whitelabel without space)
const MAPPING: Record<string, WhiteLabelConfig> = {
  'vanilla.box': {
    network: 'base',
    id: '0x8cF43759f3d4E72cB72cED6bd69cCe43d4428264',
    skinSettings: {
      bg_color: '#252739',
      link_color: '#91ACEE',
      text_color: '#CDD6F4',
      content_color: '#CDD6F4',
      border_color: '#313244',
      heading_color: '#CCD3F2',
      primary_color: '#91ACEE',
      theme: 'dark',
      logo: 'ipfs://bafkreiab7pgyo4gzvospqgrlnfp6o5d6dpq4vijnzvcf5mhwzevt4hnd2m'
    }
  },
  'vote.worldlibertyfinancial.com': {
    network: 's',
    id: 'worldlibertyfinancial.com'
  },
  'townhall.box': {
    network: 's',
    id: 'openagora.eth'
  },
  'governance.starknet.io': {
    skinSettings: {
      bg_color: '#f9f8f9',
      link_color: '#000000',
      text_color: '#4a4a4f',
      content_color: '#4a4a4f',
      border_color: '#e3e1e4',
      heading_color: '#1a1523',
      primary_color: '#000000',
      theme: 'light',
      logo: 'ipfs://bafkreibsvohq3zg4zv5rxjv3vs57jmazs6lgrunjqy5n5uahdktconwple'
    }
  },
  'starknet.stage.box': {
    skinSettings: {
      bg_color: '#f9f8f9',
      link_color: '#000000',
      text_color: '#4a4a4f',
      content_color: '#4a4a4f',
      border_color: '#e3e1e4',
      heading_color: '#1a1523',
      primary_color: '#000000',
      theme: 'light',
      logo: 'ipfs://bafkreibsvohq3zg4zv5rxjv3vs57jmazs6lgrunjqy5n5uahdktconwple'
    }
  },
  'ens.stage.box': {
    skinSettings: {
      logo: 'ipfs://bafkreigdimh5bvu3jwyqbwpgnwlumipngfvuemutzughnv77ogqpedngfq',
      bg_color: '#F6F6F6',
      link_color: '#4A5C63',
      text_color: '#011A25',
      content_color: '#586069',
      border_color: '#E4E4E4',
      heading_color: '#011A25',
      primary_color: '#0080BC',
      theme: 'light'
    }
  },
  ...(WHITELABEL_MAPPING
    ? (() => {
        const [localDomain, localSpaceId] = WHITELABEL_MAPPING.split(';');
        if (!localSpaceId) return {};
        const [network, id] = localSpaceId.split(':');
        return { [localDomain]: { network, id } };
      })()
    : {})
};

const isWhiteLabel = ref(false);
const isCustomDomain = ref(
  WHITELABEL_MAPPING ? true : domain !== DEFAULT_DOMAIN
);
const failed = ref(false);

const isElectron = !!process.env.ELECTRON;

const resolved = ref(!isCustomDomain.value || isElectron);
const space = ref<Space | null>(null);
const skinSettings = ref<SkinSettings>();

async function getSpace(domain: string): Promise<Space | null> {
  const loadSpacesParams: Record<string, string> = {};
  let spaceNetwork = metadataNetwork;

  const mapping = MAPPING[domain];

  if (mapping) {
    if (!mapping.id || !mapping.network) return null;

    loadSpacesParams.id = mapping.id;
    spaceNetwork = mapping.network;
  } else {
    loadSpacesParams.domain = domain;
  }

  const queryClient = useQueryClient();
  const network = getNetwork(spaceNetwork);
  const space = (
    await network.api.loadSpaces({ limit: 1 }, loadSpacesParams)
  )[0];

  if (!space) return null;

  queryClient.setQueryData(
    ['spaces', 'detail', `${space.network}:${space.id}`],
    space
  );

  return space;
}

export function useWhiteLabel() {
  async function init() {
    if (resolved.value) return;

    let shouldResolve = true;

    try {
      const mapping = MAPPING[domain];

      space.value = await getSpace(domain);

      if (!space.value && !mapping) return;

      if (space.value && !space.value.turbo && !mapping) {
        const redirectUrl = new URL(
          `${window.location.protocol}//${DEFAULT_DOMAIN}`
        );

        const originalHash = window.location.hash.replace(/^#\//, '');
        const globalPathKey = Object.keys(GLOBAL_PATHS).find(path =>
          originalHash.startsWith(path)
        );

        if (globalPathKey) {
          redirectUrl.hash = `#/${GLOBAL_PATHS[globalPathKey]}`;
        } else {
          const newHash = `#/${encodeURIComponent(space.value.network)}:${encodeURIComponent(space.value.id)}`;
          redirectUrl.hash = [newHash, originalHash].filter(Boolean).join('/');
        }

        window.location.href = redirectUrl.href;
        // Don't mark as resolved, to keep the UI splash screen while redirecting
        shouldResolve = false;
        return;
      }

      isWhiteLabel.value = true;
      skinSettings.value =
        mapping?.skinSettings || space.value?.additionalRawData?.skinSettings;
    } catch (err) {
      console.log(err);
      failed.value = true;
    } finally {
      resolved.value = shouldResolve;
    }
  }

  return {
    init,
    isWhiteLabel,
    isCustomDomain,
    failed,
    space,
    skinSettings,
    resolved
  };
}
