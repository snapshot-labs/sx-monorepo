import { getAddresses, getENSNames } from '@/helpers/stamp';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { getSpaces } from '@/queries/spaces';
import { NetworkID } from '@/types';

type ENSNameStatus = 'AVAILABLE' | 'USED' | 'TOO_LONG' | 'DELETED';
type ENSName = { name: string; status: ENSNameStatus };
type ENSNames = Record<ENSName['name'], ENSName>;

const MAX_ENS_NAME_LENGTH = 64;
const DEFAULT_STATUS = 'AVAILABLE';
const LOOKUP_CHAIN_IDS = {
  s: ['1', '109'],
  's-tn': ['11155111', '157']
};

const ensNames = ref<Map<string, ENSNames>>(new Map());
const customEnsNames = ref<Map<string, ENSNames>>(new Map());
const checkedDeletedSpaceIds = new Map<string, boolean>();

async function fetchDeletedSpaces(networkId: NetworkID, ids: string[]) {
  const newIds = ids.filter(id => !checkedDeletedSpaceIds.has(id));

  if (!newIds.length) return;

  const network = getNetwork(networkId);
  const hubUrl = network.api.apiUrl.replace('/graphql', '');

  await Promise.allSettled(
    newIds.map(async id => {
      try {
        const response = await fetch(`${hubUrl}/api/spaces/${id}`, {
          headers: { 'Content-Type': 'application/json' }
        });

        checkedDeletedSpaceIds.set(
          id,
          (await response.json())?.deleted === true
        );
      } catch (e) {
        console.error(e);
      }
    })
  );
}

export function useWalletEns(networkId: NetworkID) {
  const { web3, authInitiated } = useWeb3();

  const isLoading = ref(false);
  const isRefreshing = ref(false);
  const hasError = ref(false);

  const names = computed(() =>
    Array.from(
      new Set([
        ...Object.values(ensNames.value.get(web3.value.account) || {}),
        ...Object.values(customEnsNames.value.get(web3.value.account) || {})
      ])
    )
  );

  const network = computed(() => getNetwork(networkId));

  async function validateDeletedSpaces(records: ENSNames) {
    const ids = Object.values(records)
      .filter(d => d.status === DEFAULT_STATUS)
      .map(d => d.name);

    await fetchDeletedSpaces(networkId, ids);

    ids.forEach(id => {
      if (checkedDeletedSpaceIds.get(id)) {
        records[id].status = 'DELETED';
      }
    });
  }

  function validateNameLength(records: ENSNames) {
    Object.values(records).forEach(d => {
      if (d.name.length > MAX_ENS_NAME_LENGTH) {
        d.status = 'TOO_LONG';
      }
    });
  }

  async function validateUsedNames(records: ENSNames) {
    const ids = Object.values(records)
      .filter(d => d.status === DEFAULT_STATUS)
      .map(d => `${networkId}:${d.name}`);

    if (!ids.length) return;

    const spaces = await getSpaces({
      id_in: ids
    });

    spaces.forEach(space => {
      records[space.id].status = 'USED';
    });
  }

  async function validateNames(values: string[]) {
    const records: ENSNames = values.reduce((acc, name) => {
      acc[name] = { name, status: DEFAULT_STATUS };
      return acc;
    }, {});

    validateNameLength(records);
    await validateUsedNames(records);
    await validateDeletedSpaces(records);

    return records;
  }

  async function load(silent = false) {
    if (silent) isRefreshing.value = true;
    isLoading.value = true;

    try {
      const records = await validateNames(
        await getENSNames(web3.value.account, LOOKUP_CHAIN_IDS[networkId])
      );
      ensNames.value.set(web3.value.account, records);
      hasError.value = false;
    } catch (e) {
      console.error(e);
      hasError.value = true;
    } finally {
      isRefreshing.value = false;
      isLoading.value = false;
    }
  }

  async function attachCustomName(name: string): Promise<boolean> {
    const resolvedAddress =
      (await getAddresses([name], network.value.chainId))[name] || '';

    if (!compareAddresses(resolvedAddress, web3.value.account)) {
      return false;
    }

    const records = await validateNames([name]);
    customEnsNames.value.set(web3.value.account, records);

    return true;
  }

  function refresh() {
    return load(true);
  }

  watch(
    [
      () => web3.value.account,
      () => web3.value.authLoading,
      () => authInitiated.value
    ],
    async ([newAccount, loading, authInitiated]) => {
      if (loading || !authInitiated) return;

      await load(ensNames.value.has(newAccount));
    },
    { immediate: true }
  );

  return {
    MAX_ENS_NAME_LENGTH,
    isRefreshing,
    isLoading,
    hasError,
    names,
    attachCustomName,
    load,
    refresh
  };
}
