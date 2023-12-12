/* eslint-disable @typescript-eslint/no-unused-vars */

import { Contract, CallData } from 'starknet';
import fetch from 'cross-fetch';
import EVMSlotValue from './abis/EVMSlotValue.json';
import SpaceAbi from '../../clients/starknet/starknet-tx/abis/Space.json';
import type { ClientConfig, Envelope, Strategy, Propose, Vote } from '../../types';
import { keccak256 } from '@ethersproject/keccak256';
import { getUserAddressEnum } from '../../utils/starknet-enums';

export default function createEvmSlotValueStrategy({
  deployedOnChain
}: {
  deployedOnChain: string;
}): Strategy {
  function getEthRpc(chainId: number) {
    const apiKey = '46a5dd9727bf48d4a132672d3f376146';

    // TODO: ideally we would use rpc.snapshotx.xyz here but those don't support eth_getProof with past lookup
    if (chainId === 1) return `https://mainnet.infura.io/v3/${apiKey}`;
    if (chainId === 5) return `https://goerli.infura.io/v3/${apiKey}`;
    if (chainId === 11155111) return `https://sepolia.infura.io/v3/${apiKey}`;
    if (chainId === 137) return `https://polygon-mainnet.infura.io/v3/${apiKey}`;
    if (chainId === 42161) return `https://arbitrum-mainnet.infura.io/v3/${apiKey}`;

    throw new Error(`Unsupported chainId ${chainId}`);
  }

  async function getBinaryTree(snapshotTimestamp: number, chainId: number) {
    const res = await fetch(
      `https://ds-indexer.api.herodotus.cloud/binsearch-path?timestamp=${snapshotTimestamp}&deployed_on_chain=${deployedOnChain}&accumulates_chain=${chainId}`,
      {
        headers: {
          accept: 'application/json'
        }
      }
    );

    return res.json();
  }

  async function getProof(
    l1TokenAddress: string,
    voterAddress: string,
    slotIndex: number,
    blockNumber: number,
    chainId: number
  ) {
    const rpcUrl = getEthRpc(chainId);
    const slotKey = keccak256(
      `0x${voterAddress.slice(2).padStart(64, '0')}${slotIndex.toString(16).padStart(64, '0')}`
    );

    const res = await fetch(rpcUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getProof',
        params: [l1TokenAddress, [slotKey], `0x${blockNumber.toString(16)}`]
      })
    });

    const { result } = await res.json();

    return result.storageProof[0].proof.map(
      (node: string) =>
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
    type: 'evmSlotValue',
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
      if (!metadata) throw new Error('Invalid metadata');

      const voteEnvelope = envelope as Envelope<Vote>;

      const spaceContract = new Contract(
        SpaceAbi,
        voteEnvelope.data.space,
        clientConfig.starkProvider
      );
      const proposalStruct = (await spaceContract.call('proposals', [
        voteEnvelope.data.proposal
      ])) as any;
      const startTimestamp = proposalStruct.start_timestamp;

      const { chainId, contractAddress, slotIndex } = metadata;

      const tree = await getBinaryTree(startTimestamp, chainId);
      const l1BlockNumber = tree.path[1].blockNumber;

      const storageProof = await getProof(
        contractAddress,
        signerAddress,
        slotIndex,
        l1BlockNumber,
        chainId
      );

      return CallData.compile({
        storageProof
      });
    },
    async getVotingPower(
      spaceAddress: string,
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      timestamp: number | null,
      params: string[],
      clientConfig: ClientConfig
    ): Promise<bigint> {
      if (!timestamp) return 0n;
      if (!metadata) return 0n;

      const contract = new Contract(EVMSlotValue, strategyAddress, clientConfig.starkProvider);

      const spaceContract = new Contract(SpaceAbi, spaceAddress, clientConfig.starkProvider);
      const proposalStruct = (await spaceContract.call('proposals', [3])) as any;
      const startTimestamp = proposalStruct.start_timestamp;

      const { chainId, contractAddress, slotIndex } = metadata;

      const tree = await getBinaryTree(startTimestamp, chainId);
      const l1BlockNumber = tree.path[1].blockNumber;

      const storageProof = await getProof(
        contractAddress,
        voterAddress,
        slotIndex,
        l1BlockNumber,
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
