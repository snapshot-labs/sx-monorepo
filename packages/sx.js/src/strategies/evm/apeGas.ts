import { defaultAbiCoder } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import DelegateRegistryAbi from './abis/DelegateRegistry.json';
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

        const delegateRegistryContract = new Contract(
          delegateRegistry,
          DelegateRegistryAbi,
          provider
        );

        const delegation = await delegateRegistryContract.delegation(
          voterAddress,
          metadata.delegationId
        );

        let totalVP = 0n;
        if (delegation === '0x0000000000000000000000000000000000000000') {
          const balance = await provider.getBalance(voterAddress);
          totalVP += balance.toBigInt();
        }

        const delegators = await delegateRegistryContract.getDelegators(
          voterAddress,
          metadata.delegationId
        );

        // TODO: Use multicall to get all balances in one call
        for (const delegator of delegators) {
          const balance = await provider.getBalance(delegator);
          totalVP += balance.toBigInt();
        }

        return totalVP;
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
