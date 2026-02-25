/* eslint-disable @typescript-eslint/no-unused-vars */

import { Contract as EvmContract } from '@ethersproject/contracts';
import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CallData, Contract, LibraryError } from 'starknet';
import OZVotesStorageProof from './abis/OZVotesStorageProof.json';
import OzVotesToken from './abis/OzVotesToken.json';
import { getNestedSlotKey, getSlotKey } from './utils';
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

export default function createOzVotesStorageProofStrategy({
  trace
}: {
  trace: 208 | 224;
}): Strategy {
  const type = 'ozVotesStorageProof';

  async function getProofs(
    l1TokenAddress: string,
    voterAddress: string,
    numCheckpoints: number,
    slotIndex: number,
    blockNumber: number,
    ethUrl: string,
    chainId: number
  ) {
    const provider = new StaticJsonRpcProvider(ethUrl, chainId);

    const checkpointSlotKey =
      BigInt(keccak256(getSlotKey(voterAddress, slotIndex))) +
      BigInt(numCheckpoints) -
      BigInt(1);
    const nextEmptySlotKey = checkpointSlotKey + BigInt(1);

    const proof = await provider.send('eth_getProof', [
      l1TokenAddress,
      [
        `0x${checkpointSlotKey.toString(16)}`,
        `0x${nextEmptySlotKey.toString(16)}`
      ],
      `0x${blockNumber.toString(16)}`
    ]);

    const proofs = proof.storageProof.map(({ proof }: { proof: string[] }) =>
      proof.map((node: string) =>
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
      )
    ) as string[][];

    return {
      proofs,
      checkpointIndex: BigInt(numCheckpoints) - BigInt(1)
    };
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

      const { starkProvider, ethUrl, networkConfig } = clientConfig;
      const { herodotusAccumulatesChainId: chainId } = networkConfig;
      const { contractAddress, slotIndex } = metadata;

      const provider = new StaticJsonRpcProvider(ethUrl, chainId);
      const tokenContract = new EvmContract(
        contractAddress,
        OzVotesToken,
        provider
      );
      const numCheckpoints: number =
        await tokenContract.numCheckpoints(signerAddress);
      if (numCheckpoints === 0) throw new Error('No checkpoints found');

      const voteEnvelope = envelope as Envelope<Vote>;

      const spaceContract = new Contract(
        SpaceAbi,
        voteEnvelope.data.space,
        starkProvider
      );
      const proposalStruct = (await spaceContract.call('proposals', [
        voteEnvelope.data.proposal
      ])) as any;
      const startTimestamp = proposalStruct.start_timestamp;

      const contract = new Contract(
        OZVotesStorageProof,
        address,
        starkProvider
      );
      const l1BlockNumber = await contract.cached_timestamps(startTimestamp);

      const { proofs, checkpointIndex } = await getProofs(
        contractAddress,
        signerAddress,
        numCheckpoints,
        slotIndex,
        l1BlockNumber,
        ethUrl,
        chainId
      );

      const [checkpointMptProof, exclusionMptProof] = proofs;
      if (!checkpointMptProof || !exclusionMptProof)
        throw new Error('Invalid proofs');

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
          checkpointIndex,
          checkpointMptProof,
          exclusionMptProof
        })
      );

      return CallData.compile({
        checkpointIndex,
        checkpointMptProof,
        exclusionMptProof
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

      const { starkProvider, ethUrl, networkConfig } = clientConfig;
      const { herodotusAccumulatesChainId: chainId } = networkConfig;
      const { contractAddress, slotIndex } = metadata;
      const provider = new StaticJsonRpcProvider(ethUrl, chainId);

      if (!timestamp) {
        const slotKey = getSlotKey(voterAddress, slotIndex);
        const length = Number(
          await provider.getStorageAt(contractAddress, slotKey)
        );

        const nestedSlotKey = getNestedSlotKey(slotKey, length - 1);
        const storage = await provider.getStorageAt(
          contractAddress,
          nestedSlotKey
        );

        const bytesToSkip = (256 - trace) / 8;
        return BigInt(storage.slice(0, -bytesToSkip * 2));
      }

      const tokenContract = new EvmContract(
        contractAddress,
        OzVotesToken,
        provider
      );

      const numCheckpoints: number =
        await tokenContract.numCheckpoints(voterAddress);
      if (numCheckpoints === 0) return 0n;

      const contract = new Contract(
        OZVotesStorageProof,
        strategyAddress,
        starkProvider
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

      const { proofs, checkpointIndex } = await getProofs(
        contractAddress,
        voterAddress,
        numCheckpoints,
        slotIndex,
        Number(l1BlockNumber),
        ethUrl,
        chainId
      );

      const [checkpointMptProof, exclusionMptProof] = proofs;
      if (!checkpointMptProof || !exclusionMptProof)
        throw new Error('Invalid proofs');

      try {
        return await contract.get_voting_power(
          timestamp,
          getUserAddressEnum('ETHEREUM', voterAddress),
          params,
          CallData.compile({
            checkpointIndex,
            checkpointMptProof,
            exclusionMptProof
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
