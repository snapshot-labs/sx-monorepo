/* eslint-disable @typescript-eslint/no-unused-vars */

import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CallData, Contract, LibraryError } from 'starknet';
import EVMSlotValue from './abis/EVMSlotValue.json';
import { getSlotKey } from './utils';
import SpaceAbi from '../../clients/starknet/starknet-tx/abis/Space.json';
import {
  ClientConfig,
  Envelope,
  Propose,
  Strategy,
  Vote
} from '../../clients/starknet/types';
import { VotingPowerDetailsError } from '../../utils/errors';
import { getUserAddressEnum } from '../../utils/starknet-enums';

export default function createEvmSlotValueStrategy(): Strategy {
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
      params: string,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      if (call === 'propose') throw new Error('Not supported for proposing');
      if (signerAddress.length !== 42)
        throw new Error('Not supported for non-Ethereum addresses');
      if (!metadata) throw new Error('Invalid metadata');

      const voteEnvelope = envelope as Envelope<Vote>;

      const { starkProvider, ethUrl, networkConfig } = clientConfig;

      const spaceContract = new Contract(
        SpaceAbi,
        voteEnvelope.data.space,
        starkProvider
      );
      const proposalStruct = (await spaceContract.call('proposals', [
        voteEnvelope.data.proposal
      ])) as any;
      const startTimestamp = proposalStruct.start_timestamp;

      const { herodotusAccumulatesChainId: chainId } = networkConfig;
      const { contractAddress, slotIndex } = metadata;

      const contract = new Contract(EVMSlotValue, address, starkProvider);
      const l1BlockNumber = await contract.cached_timestamps(startTimestamp);

      const storageProof = await getProof(
        contractAddress,
        signerAddress,
        slotIndex,
        l1BlockNumber,
        ethUrl,
        chainId
      );

      // This check is only needed to look for "Slot is zero" error
      // Current storage proof contracts will revert if we try to use them
      // and user has no slot value.
      // This can be removed after contracts include this
      // https://github.com/snapshot-labs/sx-starknet/pull/624
      await contract.get_voting_power(
        startTimestamp,
        getUserAddressEnum('ETHEREUM', signerAddress),
        params.split(','),
        CallData.compile({
          storageProof
        })
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
        const provider = new StaticJsonRpcProvider(
          clientConfig.ethUrl,
          chainId
        );
        const storage = await provider.getStorageAt(
          contractAddress,
          getSlotKey(voterAddress, slotIndex)
        );

        return BigInt(storage);
      }

      const contract = new Contract(
        EVMSlotValue,
        strategyAddress,
        clientConfig.starkProvider
      );

      let l1BlockNumber: bigint;
      try {
        l1BlockNumber = await contract.cached_timestamps(timestamp);
      } catch (e) {
        throw new VotingPowerDetailsError(
          'Timestamp is not cached',
          type,
          'NOT_READY_YET'
        );
      }

      const storageProof = await getProof(
        contractAddress,
        voterAddress,
        slotIndex,
        Number(l1BlockNumber),
        ethUrl,
        chainId
      );

      try {
        return await contract.get_voting_power(
          timestamp,
          getUserAddressEnum('ETHEREUM', voterAddress),
          params,
          CallData.compile({
            storageProof
          })
        );
      } catch (e) {
        if (e instanceof LibraryError) {
          // can be removed after contracts include this
          // https://github.com/snapshot-labs/sx-starknet/pull/624
          if (e.message.includes('Slot is zero')) return 0n;
        }

        throw e;
      }
    }
  };
}
