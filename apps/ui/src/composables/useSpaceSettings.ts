import objectHash from 'object-hash';
import { Ref } from 'vue';
import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { clone, compareAddresses } from '@/helpers/utils';
import { evmNetworks, getNetwork, offchainNetworks } from '@/networks';
import { ApiSpace as OffchainApiSpace } from '@/networks/offchain/api/types';
import {
  GeneratedMetadata,
  StrategyConfig,
  StrategyTemplate
} from '@/networks/types';
import { Member, Space, SpaceMetadata, StrategyParsedMetadata } from '@/types';

export type OffchainSpaceSettings = {
  name: string;
  about: string;
  avatar: string;
  cover: string | null;
  network: string;
  symbol: string;
  terms: string;
  website: string;
  twitter: string;
  github: string;
  coingecko: string;
  parent: string | null;
  children: string[];
  private: boolean;
  domain: string | null;
  skin: string | null;
  guidelines: string | null;
  template: string | null;
  strategies: any[];
  categories: string[];
  treasuries: OffchainApiSpace['treasuries'];
  admins: string[];
  moderators: string[];
  members: string[];
  plugins: OffchainApiSpace['plugins'];
  delegationPortal: Omit<
    NonNullable<OffchainApiSpace['delegationPortal']>,
    'delegationNetwork'
  > | null;
  filters: { minScore: number; onlyMembers: boolean };
  voting: Partial<OffchainApiSpace['voting']>;
  boost: OffchainApiSpace['boost'];
  validation: OffchainApiSpace['validation'];
  voteValidation: OffchainApiSpace['voteValidation'];
};

type Form = SpaceMetadata & { categories: string[]; coingecko: string };

const DEFAULT_FORM_STATE: Form = {
  name: '',
  categories: [],
  avatar: '',
  cover: '',
  description: '',
  externalUrl: '',
  twitter: '',
  github: '',
  discord: '',
  coingecko: '',
  votingPowerSymbol: '',
  treasuries: [],
  delegations: []
};

export function useSpaceSettings(space: Ref<Space>) {
  const { web3 } = useWeb3();
  const { getDurationFromCurrent } = useMetaStore();
  const {
    updateSettings,
    updateSettingsRaw,
    transferOwnership,
    deleteSpace: deleteSpaceAction
  } = useActions();

  const loading = ref(true);
  const isModified = ref(false);

  const network = computed(() => getNetwork(space.value.network));
  const isController = computedAsync(async () => {
    const { account } = web3.value;

    const controller = await network.value.helpers.getSpaceController(
      space.value
    );

    return compareAddresses(controller, account);
  }, false);
  const isOwner = computedAsync(async () => {
    if (!offchainNetworks.includes(space.value.network)) {
      return isController.value;
    }

    const { account } = web3.value;

    const owner = await getNameOwner(
      space.value.id,
      network.value.chainId as ENSChainId
    );

    return compareAddresses(owner, account);
  }, false);
  const isAdmin = computed(() => {
    if (!offchainNetworks.includes(space.value.network)) return false;

    if (space.value.additionalRawData?.type === 'offchain') {
      const admins = space.value.additionalRawData.admins.map(admin =>
        admin.toLowerCase()
      );

      return admins.includes(web3.value.account.toLowerCase());
    }

    return false;
  });
  const canModifySettings = computed(() => isController.value || isAdmin.value);

  // Common properties
  const form: Ref<Form> = ref(clone(DEFAULT_FORM_STATE));
  const formErrors = ref({} as Record<string, string>);
  const votingDelay: Ref<number | null> = ref(null);
  const minVotingPeriod: Ref<number | null> = ref(null);
  const maxVotingPeriod: Ref<number | null> = ref(null);
  const initialController = ref('');
  const controller = ref('');

  // Onchain properties
  const authenticators = ref([] as StrategyConfig[]);
  const validationStrategy = ref(null as StrategyConfig | null);
  const votingStrategies = ref([] as StrategyConfig[]);
  const initialValidationStrategyObjectHash = ref(null as string | null);

  // Offchain properties
  const members = ref([] as Member[]);
  const parent = ref('');
  const children = ref([] as string[]);
  const termsOfServices = ref('');
  const customDomain = ref('');
  const isPrivate = ref(false);

  function currentToMinutesOnly(value: number) {
    const duration = getDurationFromCurrent(space.value.network, value);
    return Math.round(duration / 60) * 60;
  }

  function processParams(paramsArray: string[]) {
    return paramsArray.map(params => (params === '' ? [] : params.split(',')));
  }

  function processMetadata(
    metadataArray: StrategyParsedMetadata[]
  ): GeneratedMetadata[] {
    return metadataArray.map(metadata => {
      const result: GeneratedMetadata = {
        name: metadata.name,
        properties: {
          decimals: metadata.decimals,
          symbol: metadata.symbol
        }
      };

      if (metadata.name) result.name = metadata.name;
      if (metadata.description) result.description = metadata.description;
      if (metadata.payload !== null)
        result.properties.payload = metadata.payload;
      if (metadata.token !== null) result.properties.token = metadata.token;

      return result;
    });
  }

  async function getInitialStrategiesConfig(
    configured: string[],
    editorStrategies: StrategyTemplate[],
    params?: string[],
    metadata?: StrategyParsedMetadata[]
  ): Promise<StrategyConfig[]> {
    const promises = configured.map(async (configuredAddress, i) => {
      const strategy = editorStrategies.find(({ address }) =>
        compareAddresses(address, configuredAddress)
      );

      if (!strategy) return null;

      const resolvedParams =
        strategy.parseParams && params && metadata
          ? await strategy.parseParams(params[i], metadata[i])
          : {};

      return {
        id: crypto.randomUUID(),
        params: resolvedParams,
        ...strategy
      };
    });

    return (await Promise.all(promises)).filter(strategy => strategy !== null);
  }

  async function getInitialValidationStrategy(
    configuredAddress: string,
    editorStrategies: StrategyTemplate[],
    params: string,
    nestedStrategies: string[],
    nestedStrategiesParams: string[],
    nestedStrategiesMetadata: StrategyParsedMetadata[]
  ) {
    const strategy = editorStrategies.find(({ address }) =>
      compareAddresses(address, configuredAddress)
    );

    if (!strategy) return null;

    const resolvedParams = strategy.parseParams
      ? await strategy.parseParams(params, null)
      : {};
    const strategies = await getInitialStrategiesConfig(
      nestedStrategies,
      network.value.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
      nestedStrategiesParams,
      nestedStrategiesMetadata
    );

    return {
      id: crypto.randomUUID(),
      params: {
        ...resolvedParams,
        strategies
      },
      ...strategy
    };
  }

  async function hasStrategyChanged(
    strategy: StrategyConfig,
    previousParams: any,
    previousMetadata: any = {}
  ) {
    const metadata = strategy.generateMetadata
      ? await strategy.generateMetadata(strategy.params)
      : {};

    if (objectHash(metadata) !== objectHash(previousMetadata)) return true;
    if (strategy.type === 'MerkleWhitelist') {
      // NOTE: MerkleWhitelist params are expensive to compute so we try to skip this step if possible.
      // If metadata has changed then we already know strategy has changed, if metadata is the same
      // we can assume params are the same as well as they use the same source params.
      return false;
    }

    let params: string[] = [];
    if (evmNetworks.includes(space.value.network)) {
      params = strategy.generateParams
        ? strategy.generateParams(strategy.params)
        : ['0x'];
      previousParams = previousParams ?? ['0x'];
    } else {
      params = strategy.generateParams
        ? strategy.generateParams(strategy.params)
        : [];
      previousParams = previousParams ?? [];
    }

    // NOTE: Params need to be kept in raw bytes when we compare them as once stored they will be stored
    // as bytes (casing and padding are lost).
    const formattedParams = params.map(param =>
      param === '0x' ? param : `0x${BigInt(param).toString(16)}`
    );
    return objectHash(formattedParams) !== objectHash(previousParams);
  }

  async function processChanges(
    editorStrategies: StrategyConfig[],
    currentAddresses: string[],
    params: any[],
    metadata: StrategyParsedMetadata[]
  ): Promise<[StrategyConfig[], number[]]> {
    const processedParams = processParams(params);
    const processedMetadata = processMetadata(metadata);

    const current = [...currentAddresses];
    const currentStrategiesParams = [...processedParams];
    const currentStrategiesMetadata = [...processedMetadata];
    const toAdd = [] as StrategyConfig[];
    for (const target of editorStrategies) {
      let isInCurrent = false;

      for (const [currentIndex, address] of current.entries()) {
        const matchingStrategy =
          compareAddresses(address, target.address) &&
          !(await hasStrategyChanged(
            target,
            currentStrategiesParams[currentIndex],
            currentStrategiesMetadata[currentIndex]
          ));

        if (matchingStrategy) {
          isInCurrent = true;
          current.splice(currentIndex, 1);
          currentStrategiesParams.splice(currentIndex, 1);
          currentStrategiesMetadata.splice(currentIndex, 1);
          break;
        }
      }

      if (!isInCurrent) toAdd.push(target);
    }

    const target = [...editorStrategies];
    const toRemove = [] as number[];
    for (const [currentIndex, address] of currentAddresses.entries()) {
      let isInTarget = false;

      for (const [targetIndex, strategy] of target.entries()) {
        const matchingStrategy =
          compareAddresses(address, strategy.address) &&
          !(await hasStrategyChanged(
            strategy,
            processedParams[currentIndex],
            processedMetadata[currentIndex]
          ));

        if (matchingStrategy) {
          isInTarget = true;
          target.splice(targetIndex, 1);
          break;
        }
      }

      if (!isInTarget) toRemove.push(currentIndex);
    }

    return [toAdd, toRemove];
  }

  function getInitialForm(space: Space): Form {
    return {
      name: space.name,
      categories: space.additionalRawData?.categories || [],
      avatar: space.avatar,
      cover: space.cover,
      description: space.about || '',
      externalUrl: space.external_url,
      github: space.github,
      discord: space.discord,
      coingecko: space.coingecko || '',
      twitter: space.twitter,
      votingPowerSymbol: space.voting_power_symbol,
      treasuries: space.treasuries,
      delegations: space.delegations.filter(
        delegation => delegation.apiType !== 'delegate-registry'
      )
    };
  }

  function getInitialMembers(space: Space): Member[] {
    if (space.additionalRawData?.type !== 'offchain') return [];

    return [
      ...space.additionalRawData.admins.map(address => ({
        address,
        role: 'admin' as const
      })),
      ...space.additionalRawData.moderators.map((address: string) => ({
        address,
        role: 'moderator' as const
      })),
      ...space.additionalRawData.members.map((address: string) => ({
        address,
        role: 'author' as const
      }))
    ];
  }

  async function saveOffchain() {
    if (space.value.additionalRawData?.type !== 'offchain') {
      throw new Error('Missing raw data for offchain space');
    }

    let delegationPortal: OffchainSpaceSettings['delegationPortal'] = null;
    if (
      form.value.delegations.length > 0 &&
      form.value.delegations[0].contractAddress &&
      form.value.delegations[0].apiUrl &&
      form.value.delegations[0].apiType
    ) {
      const apiType =
        form.value.delegations[0].apiType === 'governor-subgraph'
          ? 'compound-governor'
          : form.value.delegations[0].apiType;

      delegationPortal = {
        delegationContract: form.value.delegations[0].contractAddress,
        delegationApi: form.value.delegations[0].apiUrl,
        delegationType: apiType
      };
    }

    const saveData: OffchainSpaceSettings = {
      name: form.value.name ?? space.value.name,
      about: (form.value.description ?? space.value.about) || '',
      categories:
        form.value.categories ?? space.value.additionalRawData.categories,
      avatar: form.value.avatar ?? space.value.avatar,
      cover: form.value.cover ?? space.value.cover,
      network: space.value.snapshot_chain_id?.toString() ?? '1',
      symbol: form.value.votingPowerSymbol ?? space.value.voting_power_symbol,
      terms: termsOfServices.value,
      website: form.value.externalUrl ?? space.value.external_url,
      twitter: form.value.twitter ?? space.value.twitter,
      github: form.value.github ?? space.value.github,
      coingecko: form.value.coingecko ?? space.value.coingecko,
      parent: parent.value,
      children: children.value,
      private: isPrivate.value,
      domain: customDomain.value,
      skin: space.value.additionalRawData.skin,
      guidelines: space.value.additionalRawData.guidelines,
      template: space.value.additionalRawData.template,
      strategies: space.value.additionalRawData.strategies,
      treasuries: form.value.treasuries.map(treasury => ({
        address: treasury.address || '',
        name: treasury.name || '',
        network: treasury.chainId?.toString() ?? '1'
      })),
      admins: members.value
        .filter(member => member.role === 'admin')
        .map(member => member.address),
      moderators: members.value
        .filter(member => member.role === 'moderator')
        .map(member => member.address),
      members: members.value
        .filter(member => member.role === 'author')
        .map(member => member.address),
      plugins: space.value.additionalRawData.plugins,
      delegationPortal: delegationPortal,
      filters: space.value.additionalRawData.filters,
      voting: {
        ...space.value.additionalRawData.voting,
        delay:
          (votingDelay.value ?? space.value.additionalRawData.voting.delay) ||
          undefined,
        period:
          (maxVotingPeriod.value ??
            space.value.additionalRawData.voting.period) ||
          undefined,
        type: space.value.additionalRawData.voting.type || undefined,
        quorum: space.value.additionalRawData.voting.quorum || undefined,
        quorumType:
          space.value.additionalRawData.voting.quorumType || 'default',
        privacy: space.value.additionalRawData.voting.privacy || undefined
      },
      validation: space.value.additionalRawData.validation,
      voteValidation: space.value.additionalRawData.voteValidation,
      boost: space.value.additionalRawData.boost
    };

    const prunedSaveData: Partial<OffchainSpaceSettings> = clone(saveData);
    Object.entries(prunedSaveData).forEach(([key, value]) => {
      if (value === null || value === '') delete prunedSaveData[key];
    });
    if (
      prunedSaveData.delegationPortal &&
      !prunedSaveData.delegationPortal.delegationContract &&
      !prunedSaveData.delegationPortal.delegationApi
    ) {
      delete prunedSaveData.delegationPortal;
    }
    if (
      prunedSaveData.voting &&
      prunedSaveData.voting.quorumType === 'default'
    ) {
      delete prunedSaveData.voting.quorumType;
    }

    return updateSettingsRaw(space.value, JSON.stringify(prunedSaveData));
  }

  async function saveOnchain() {
    if (!validationStrategy.value) {
      throw new Error('Validation strategy is missing');
    }

    const [authenticatorsToAdd, authenticatorsToRemove] = await processChanges(
      authenticators.value,
      space.value.authenticators,
      [],
      []
    );

    const [strategiesToAdd, strategiesToRemove] = await processChanges(
      votingStrategies.value,
      space.value.strategies,
      space.value.strategies_params,
      space.value.strategies_parsed_metadata
    );

    return updateSettings(
      space.value,
      form.value,
      authenticatorsToAdd,
      authenticatorsToRemove,
      strategiesToAdd,
      strategiesToRemove,
      validationStrategy.value,
      votingDelay.value,
      minVotingPeriod.value,
      maxVotingPeriod.value
    );
  }

  async function save() {
    if (offchainNetworks.includes(space.value.network)) {
      return saveOffchain();
    } else {
      return saveOnchain();
    }
  }

  async function saveController() {
    return transferOwnership(space.value, controller.value);
  }

  async function deleteSpace() {
    return deleteSpaceAction(space.value);
  }

  async function reset({ force = false } = {}) {
    const authenticatorsValue = await getInitialStrategiesConfig(
      space.value.authenticators,
      network.value.constants.EDITOR_AUTHENTICATORS
    );

    const votingStrategiesValue = await getInitialStrategiesConfig(
      space.value.strategies,
      network.value.constants.EDITOR_VOTING_STRATEGIES,
      space.value.strategies_params,
      space.value.strategies_parsed_metadata
    );

    const validationStrategyValue = await getInitialValidationStrategy(
      space.value.validation_strategy,
      network.value.constants.EDITOR_PROPOSAL_VALIDATIONS,
      space.value.validation_strategy_params,
      space.value.voting_power_validation_strategy_strategies,
      space.value.voting_power_validation_strategy_strategies_params,
      space.value.voting_power_validation_strategies_parsed_metadata
    );

    controller.value = force
      ? await network.value.helpers.getSpaceController(space.value)
      : initialController.value;
    initialController.value = controller.value;

    formErrors.value = {};
    form.value = getInitialForm(space.value);

    votingDelay.value = null;
    minVotingPeriod.value = null;
    maxVotingPeriod.value = null;

    authenticators.value = authenticatorsValue;
    votingStrategies.value = votingStrategiesValue;
    validationStrategy.value = validationStrategyValue;
    initialValidationStrategyObjectHash.value = objectHash(
      validationStrategyValue
    );

    if (offchainNetworks.includes(space.value.network)) {
      members.value = getInitialMembers(space.value);
      parent.value = space.value.parent?.id ?? '';
      children.value = space.value.children.map(child => child.id);
      termsOfServices.value = space.value.additionalRawData?.terms ?? '';
      customDomain.value = space.value.additionalRawData?.domain ?? '';
      isPrivate.value = space.value.additionalRawData?.private ?? false;
    }
  }

  watchEffect(async () => {
    isModified.value = false;

    // NOTE: those need to be reassigned there as async watcher won't track changes after await call
    const formValue = form.value;
    const votingDelayValue = votingDelay.value;
    const minVotingPeriodValue = minVotingPeriod.value;
    const maxVotingPeriodValue = maxVotingPeriod.value;
    const authenticatorsValue = authenticators.value;
    const votingStrategiesValue = votingStrategies.value;
    const validationStrategyValue = validationStrategy.value;
    const initialValidationStrategyObjectHashValue =
      initialValidationStrategyObjectHash.value;
    const membersValue = members.value;
    const parentValue = parent.value;
    const childrenValue = children.value;
    const termsOfServicesValue = termsOfServices.value;
    const customDomainValue = customDomain.value;
    const isPrivateValue = isPrivate.value;

    if (loading.value) {
      isModified.value = false;
      return;
    }

    if (objectHash(formValue) !== objectHash(getInitialForm(space.value))) {
      isModified.value = true;
      return;
    }

    if (
      votingDelayValue !== null &&
      votingDelayValue !== currentToMinutesOnly(space.value.voting_delay)
    ) {
      isModified.value = true;
      return;
    }

    if (
      minVotingPeriodValue !== null &&
      minVotingPeriodValue !==
        currentToMinutesOnly(space.value.min_voting_period)
    ) {
      isModified.value = true;
      return;
    }

    if (
      maxVotingPeriodValue !== null &&
      maxVotingPeriodValue !==
        currentToMinutesOnly(space.value.max_voting_period)
    ) {
      isModified.value = true;
      return;
    }

    if (offchainNetworks.includes(space.value.network)) {
      const ignoreOrderOpts = { unorderedArrays: true };

      if (
        objectHash(membersValue, ignoreOrderOpts) !==
        objectHash(getInitialMembers(space.value), ignoreOrderOpts)
      ) {
        isModified.value = true;
        return;
      }

      if (parentValue !== (space.value.parent?.id ?? '')) {
        isModified.value = true;
        return;
      }

      if (
        objectHash(childrenValue, ignoreOrderOpts) !==
        objectHash(
          space.value.children.map(child => child.id),
          ignoreOrderOpts
        )
      ) {
        isModified.value = true;
        return;
      }

      if (
        termsOfServicesValue !== (space.value.additionalRawData?.terms ?? '')
      ) {
        isModified.value = true;
        return;
      }

      if (customDomainValue !== (space.value.additionalRawData?.domain ?? '')) {
        isModified.value = true;
        return;
      }

      if (isPrivateValue !== space.value.additionalRawData?.private) {
        isModified.value = true;
        return;
      }
    } else {
      const [authenticatorsToAdd, authenticatorsToRemove] =
        await processChanges(
          authenticatorsValue,
          space.value.authenticators,
          [],
          []
        );

      if (authenticatorsToAdd.length || authenticatorsToRemove.length) {
        isModified.value = true;
        return;
      }

      const [strategiesToAdd, strategiesToRemove] = await processChanges(
        votingStrategiesValue,
        space.value.strategies,
        space.value.strategies_params,
        space.value.strategies_parsed_metadata
      );

      if (strategiesToAdd.length || strategiesToRemove.length) {
        isModified.value = true;
        return;
      }

      const hasValidationStrategyChanged =
        objectHash(validationStrategyValue) !==
        initialValidationStrategyObjectHashValue;
      if (hasValidationStrategyChanged) {
        isModified.value = true;
        return;
      }
    }

    isModified.value = false;
  });

  return {
    loading,
    isModified,
    isController,
    isOwner,
    isAdmin,
    canModifySettings,
    form,
    formErrors,
    votingDelay,
    minVotingPeriod,
    maxVotingPeriod,
    controller,
    authenticators,
    validationStrategy,
    votingStrategies,
    members,
    parent,
    children,
    termsOfServices,
    customDomain,
    isPrivate,
    save,
    saveController,
    deleteSpace,
    reset
  };
}
