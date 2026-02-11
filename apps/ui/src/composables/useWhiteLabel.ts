import { useQueryClient } from '@tanstack/vue-query';
import {
  getOrganizationByDomain,
  OrganizationDefinition
} from '@/helpers/organizations';
import { getNetwork, metadataNetwork } from '@/networks';
import { NetworkID, SkinSettings, Space } from '@/types';

// List of global paths, that should not be nested inside space scope
// when redirecting from whitelabel to main app
const GLOBAL_PATHS = { contacts: 'settings/contacts' };
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const WHITELABEL_MAPPING = import.meta.env.VITE_WHITELABEL_MAPPING;
const domain = window.location.hostname;

// Hardcoded whitelabel mappings for onchain spaces
const MAPPING: Record<
  string,
  { network: NetworkID; id: string; skinSettings?: Partial<SkinSettings> }
> = {
  'vanilla.box': {
    network: 'base',
    id: '0x8cF43759f3d4E72cB72cED6bd69cCe43d4428264',
    skinSettings: {
      bg_color: '#252739',
      link_color: '#91ACEE',
      text_color: '#CDD6F4',
      border_color: '#313244',
      heading_color: '#CCD3F2',
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
  }
};

const isWhiteLabel = ref(false);
const isOrganization = ref(false);
const organization = ref<OrganizationDefinition | null>(null);
const isCustomDomain = ref(
  WHITELABEL_MAPPING ? true : domain !== DEFAULT_DOMAIN
);
const failed = ref(false);

const isElectron = !!process.env.ELECTRON;

const resolved = ref(!isCustomDomain.value || isElectron);
const space = ref<Space | null>(null);
const skinSettings = ref<SkinSettings>();

async function loadSpace(
  spaceNetwork: NetworkID,
  loadSpacesParams: Record<string, string>
): Promise<Space | null> {
  const queryClient = useQueryClient();
  const network = getNetwork(spaceNetwork);
  const result = (
    await network.api.loadSpaces({ limit: 1 }, loadSpacesParams)
  )[0];

  if (!result) return null;

  queryClient.setQueryData(
    ['spaces', 'detail', `${result.network}:${result.id}`],
    result
  );

  return result;
}

async function getSpace(domain: string): Promise<Space | null> {
  const loadSpacesParams: Record<string, string> = {};
  let spaceNetwork: NetworkID = metadataNetwork;

  // Resolve white label domain locally if mapping is provided
  // for easier local testing
  // e.g. VITEWHITE_LABEL_MAPPING='localhost;s:snapshot.eth'
  if (WHITELABEL_MAPPING) {
    const [localDomain, localSpaceId] = WHITELABEL_MAPPING.split(';');
    if (domain === localDomain) {
      const [network, id] = localSpaceId.split(':');
      spaceNetwork = network as NetworkID;
      loadSpacesParams.id = id;
    }
  } else if (MAPPING[domain]) {
    loadSpacesParams.id = MAPPING[domain].id;
    spaceNetwork = MAPPING[domain].network;
  } else {
    loadSpacesParams.domain = domain;
  }

  return loadSpace(spaceNetwork, loadSpacesParams);
}

export function useWhiteLabel() {
  async function init() {
    if (resolved.value) return;

    let shouldResolve = true;

    try {
      // Check if domain is an organization first
      const org = getOrganizationByDomain(domain);
      if (org) {
        organization.value = org;
        isOrganization.value = true;
        isWhiteLabel.value = true;

        // Load the primary space for skin/favicon
        space.value = await loadSpace(org.primarySpace.network, {
          id: org.primarySpace.id
        });

        skinSettings.value =
          (org.skinSettings as SkinSettings) ||
          space.value?.additionalRawData?.skinSettings;

        return;
      }

      space.value = await getSpace(domain);

      if (!space.value) return;

      if (!space.value.turbo && !MAPPING[domain]) {
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
        (MAPPING[domain]?.skinSettings as SkinSettings) ||
        space.value.additionalRawData?.skinSettings;
    } catch (e) {
      console.log(e);
      failed.value = true;
    } finally {
      resolved.value = shouldResolve;
    }
  }

  return {
    init,
    isWhiteLabel,
    isOrganization,
    organization,
    isCustomDomain,
    failed,
    space,
    skinSettings,
    resolved
  };
}
