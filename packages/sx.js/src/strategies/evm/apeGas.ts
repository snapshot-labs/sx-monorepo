import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import DelegateRegistryAbi from './abis/DelegateRegistry.json';
import Multicall3Abi from './abis/Multicall3.json';
import SpaceAbi from '../../clients/evm/ethereum-tx/abis/Space.json';
import {
  ClientConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';
import { VotingPowerDetailsError } from '../../utils/errors';

const API_URL = 'https://apevote.api.herodotus.cloud';
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

async function getCurrentDelegatedVotingPower({
  provider,
  delegateRegistry,
  delegationId,
  voterAddress
}: {
  provider: Provider;
  delegateRegistry: string;
  delegationId: string;
  voterAddress: string;
}) {
  const delegateRegistryInterface = new Interface(DelegateRegistryAbi);
  const multicall = new Contract(MULTICALL3_ADDRESS, Multicall3Abi, provider);

  const calls = [
    {
      target: delegateRegistry,
      allowFailure: false,
      callData: delegateRegistryInterface.encodeFunctionData('delegation', [
        voterAddress,
        delegationId
      ])
    },
    {
      target: delegateRegistry,
      allowFailure: false,
      callData: delegateRegistryInterface.encodeFunctionData('getDelegators', [
        voterAddress,
        delegationId
      ])
    }
  ];

  const [delegationResult, getDelegatorsResult]: {
    returnData: string;
  }[] = await multicall.aggregate3(calls);

  if (!delegationResult || !getDelegatorsResult) {
    throw new Error('Missing data from DelegateRegistry');
  }

  const delegators: string[] = [];
  delegators.push(
    ...delegateRegistryInterface.decodeFunctionResult(
      'getDelegators',
      getDelegatorsResult.returnData
    )[0]
  );

  const delegation = delegateRegistryInterface.decodeFunctionResult(
    'delegation',
    delegationResult.returnData
  )[0];

  if (delegation === '0x0000000000000000000000000000000000000000') {
    delegators.push(voterAddress);
  }

  if (delegators.length === 0) return 0n;

  const results: { returnData: string }[] = await multicall.aggregate3(
    delegators.map(delegator => ({
      target: MULTICALL3_ADDRESS,
      allowFailure: false,
      callData: multicall.interface.encodeFunctionData('getEthBalance', [
        delegator
      ])
    }))
  );

  return results.reduce(
    (acc, result) => (acc += BigInt(result.returnData)),
    0n
  );
}

async function getProofData({
  viewId,
  blockNumber,
  voterAddress
}: {
  viewId: string;
  blockNumber: number;
  voterAddress: string;
}) {
  const res = await fetch(
    `${API_URL}/votes/params/${viewId}/${blockNumber}/${voterAddress}`
  );

  const data = await res.json();
  if (data.error) {
    throw new VotingPowerDetailsError(
      'Block is not cached',
      'apeGas',
      'NOT_READY_YET'
    );
  }

  return data;
}

export default function createApeGasStrategy(): Strategy {
  return {
    type: 'apeGas',
    async getParams(
      call: 'propose' | 'vote',
      strategyConfig: StrategyConfig,
      signerAddress: string,
      metadata: Record<string, any> | null,
      data: Propose | Vote,
      clientConfig: ClientConfig
    ): Promise<string> {
      if (call === 'propose') {
        throw new Error('Not supported for proposing');
      }

      if (!metadata) {
        throw new Error('Invalid metadata.');
      }

      const { space, proposal } = data as Vote;
      const spaceContract = new Contract(
        space,
        SpaceAbi,
        clientConfig.provider
      );

      const { startBlockNumber } = await spaceContract.proposals(proposal);

      const proofData = await getProofData({
        viewId: metadata.delegationId,
        blockNumber: startBlockNumber,
        voterAddress: signerAddress
      });

      return defaultAbiCoder.encode(
        [
          'tuple(bytes, address, bool, uint256, tuple(uint256, uint256, uint256)[])'
        ],
        [
          [
            `0x${proofData.account_proof}`,
            proofData.address,
            proofData.has_delegated,
            proofData.voting_power,
            proofData.trie_proof
          ]
        ]
      );
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      block: number | null,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      if (!metadata) {
        throw new Error('Invalid metadata.');
      }

      if (block === null) {
        const [, , delegateRegistry] = defaultAbiCoder.decode(
          ['address', 'bytes32', 'address'],
          params
        );

        return getCurrentDelegatedVotingPower({
          provider,
          delegateRegistry,
          delegationId: metadata.delegationId,
          voterAddress
        });
      }

      const proofData = await getProofData({
        viewId: metadata.delegationId,
        blockNumber: block,
        voterAddress
      });

      return BigInt(proofData.voting_power);
    }
  };
}
