/* eslint-disable @typescript-eslint/no-unused-vars */

import { Contract, CallData } from 'starknet';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import EVMSlotValue from './abis/EVMSlotValue.json';
import SpaceAbi from '../../clients/starknet/starknet-tx/abis/Space.json';
import { getUserAddressEnum } from '../../utils/starknet-enums';
import { getSlotKey, getBinaryTree } from './utils';
import { VotingPowerDetailsError } from '../../utils/errors';
import type { ClientConfig, Envelope, Strategy, Propose, Vote } from '../../types';

export default function createEvmSlotValueStrategy({
  deployedOnChain
}: {
  deployedOnChain: string;
}): Strategy {
  const type = 'evmSlotValue';

  async function getProof(
    l1TokenAddress: string,
    voterAddress: string,
    slotIndex: number,
    blockNumber: number,
    ethUrl: string,
    chainId: number
  ) {
    const provider = new StaticJsonRpcProvider(ethUrl, chainId);

    const proof = await provider.send('eth_getProof', [
      l1TokenAddress,
      [getSlotKey(voterAddress, slotIndex)],
      `0x${blockNumber.toString(16)}`
    ]);

    return proof.storageProof[0].proof.map((node: string) =>
      node
        .slice(2)
        .match(/.{1,16}/g)
        ?.map(
          (word: string) =>
            `0x${word
              .replace(/^(.(..)*)$/, '0$1')
              .match(/../g)
              ?.reverse()
              .join('')}`
        )
    );
  }

  return {
    type,
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      if (call === 'propose') throw new Error('Not supported for proposing');
      if (signerAddress.length !== 42) throw new Error('Not supported for non-Ethereum addresses');
      if (!metadata) throw new Error('Invalid metadata');

      const voteEnvelope = envelope as Envelope<Vote>;

      const { starkProvider, ethUrl, networkConfig } = clientConfig;

      const spaceContract = new Contract(SpaceAbi, voteEnvelope.data.space, starkProvider);
      const proposalStruct = (await spaceContract.call('proposals', [
        voteEnvelope.data.proposal
      ])) as any;
      const startTimestamp = proposalStruct.start_timestamp;

      const { herodotusAccumulatesChainId: chainId } = networkConfig;
      const { contractAddress, slotIndex } = metadata;

      const tree = await getBinaryTree(deployedOnChain, startTimestamp, chainId);
      const l1BlockNumber = tree.path[1].block_number;

      const storageProof = await getProof(
        contractAddress,
        signerAddress,
        slotIndex,
        l1BlockNumber,
        ethUrl,
        chainId
      );

      return CallData.compile({
        storageProof
      });
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      timestamp: number | null,
      params: string[],
      clientConfig: ClientConfig
    ): Promise<bigint> {
      if (!metadata) return 0n;

      const isEthereumAddress = voterAddress.length === 42;
      if (!isEthereumAddress) return 0n;

      const { ethUrl, networkConfig } = clientConfig;
      const { herodotusAccumulatesChainId: chainId } = networkConfig;
      const { contractAddress, slotIndex } = metadata;

      if (!timestamp) {
        const provider = new StaticJsonRpcProvider(clientConfig.ethUrl, chainId);
        const storage = await provider.getStorageAt(
          contractAddress,
          getSlotKey(voterAddress, slotIndex)
        );

        return BigInt(storage);
      }

      const contract = new Contract(EVMSlotValue, strategyAddress, clientConfig.starkProvider);

      const tree = await getBinaryTree(deployedOnChain, timestamp, chainId);
      if (tree.message === 'No blocks found for binsearch') {
        throw new VotingPowerDetailsError('Failed to get binary tree', type, 'NOT_READY_YET');
      }

      const l1BlockNumber = tree.path[1].block_number;

      const storageProof = await getProof(
        contractAddress,
        voterAddress,
        slotIndex,
        l1BlockNumber,
        ethUrl,
        chainId
      );

      return contract.get_voting_power(
        timestamp,
        getUserAddressEnum(voterAddress.length === 42 ? 'ETHEREUM' : 'STARKNET', voterAddress),
        params,
        CallData.compile({
          storageProof
        })
      );
    }
  };
}
