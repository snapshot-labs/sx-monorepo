import { validateAndParseAddress } from 'starknet';
import { starknetNetworks } from '@snapshot-labs/sx';

export const networkNodeUrl =
  process.env.NETWORK_NODE_URL ||
  'https://starknet-goerli.infura.io/v3/46a5dd9727bf48d4a132672d3f376146';

const createConfig = (
  networkId: keyof typeof starknetNetworks,
  { startBlock }: { startBlock: number }
) => {
  const config = starknetNetworks[networkId];

  return {
    manaRpcUrl: `https://mana.pizza/stark_rpc/${config.Meta.eip712ChainId}`,
    factoryAddress: config.Meta.spaceFactory,
    propositionPowerValidationStrategyAddress: config.ProposalValidations.VotingPower,
    herodotusStrategies: [
      config.Strategies.OZVotesStorageProof,
      config.Strategies.EVMSlotValue
    ].map(strategy => validateAndParseAddress(strategy)),
    startBlock
  };
};

let networkProperties = createConfig('sn-tn', { startBlock: 907731 });
if (process.env.NETWORK === 'SN_MAIN') {
  networkProperties = createConfig('sn', { startBlock: 445498 });
} else if (process.env.NETWORK === 'SN_SEPOLIA') {
  networkProperties = createConfig('sn-sep', { startBlock: 17960 });
}

export { networkProperties };
