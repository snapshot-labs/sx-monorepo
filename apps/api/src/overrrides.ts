import { starknetNetworks } from '@snapshot-labs/sx';
import { validateAndParseAddress } from 'starknet';

export const networkNodeUrl =
  process.env.NETWORK_NODE_URL ||
  'https://starknet-sepolia.infura.io/v3/46a5dd9727bf48d4a132672d3f376146';

export const manaRpcUrl = process.env.VITE_MANA_URL || 'https://mana.box';

const verifiedSpaces = {
  sn: [
    '0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4',
    '0x05ea5ef0c54c84dc7382629684c6e536c0b06246b3b0981c426b42372e3ef263',
    '0x07c251045154318a2376a3bb65be47d3c90df1740d8e35c9b9d943aa3f240e50',
    '0x07bd3419669f9f0cc8f19e9e2457089cdd4804a4c41a5729ee9c7fd02ab8ab62'
  ],
  'sn-sep': [
    '0x0141464688e48ae5b7c83045edb10ecc242ce0e1ad4ff44aca3402f7f47c1ab9'
  ]
};

const createConfig = (
  networkId: keyof typeof starknetNetworks,
  { startBlock }: { startBlock: number }
) => {
  const config = starknetNetworks[networkId];

  return {
    manaRpcUrl: `${manaRpcUrl}/stark_rpc/${config.Meta.eip712ChainId}`,
    baseChainId: config.Meta.herodotusAccumulatesChainId,
    factoryAddress: config.Meta.spaceFactory,
    erc20VotesStrategy: config.Strategies.ERC20Votes,
    propositionPowerValidationStrategyAddress:
      config.ProposalValidations.VotingPower,
    spaceClassHash: config.Meta.masterSpace,
    verifiedSpaces: verifiedSpaces[networkId],
    herodotusStrategies: [
      config.Strategies.OZVotesStorageProof,
      config.Strategies.OZVotesTrace208StorageProof,
      config.Strategies.EVMSlotValue
    ]
      .filter(address => !!address)
      .map(strategy => validateAndParseAddress(strategy)),
    startBlock
  };
};

let networkProperties = createConfig('sn-sep', { startBlock: 17960 });
if (process.env.NETWORK === 'SN_MAIN') {
  networkProperties = createConfig('sn', { startBlock: 445498 });
}

export { networkProperties };
