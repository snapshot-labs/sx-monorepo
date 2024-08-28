import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { pack } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Transaction } from '@/types';
import { contractData } from './constants';

type SpaceConfigResponse =
  | {
      automaticExecution: true;
    }
  | {
      automaticExecution: false;
      rules: boolean;
      bondToken: boolean;
      bondAmount: boolean;
    };

/**
 * The `proposalHash` as represented in the Optimistic Governor contract is the keccak256 hash of the transactions that make up the proposal.
 */
export function getProposalHashFromTransactions(transactions: Transaction[]) {
  const rawTxs = transactions.map(tx => {
    return {
      to: tx.to,
      operation: 0,
      value: tx.value,
      data: tx.data
    };
  });

  return keccak256(
    defaultAbiCoder.encode(
      ['(address to, uint8 operation, uint256 value, bytes data)[]'],
      [rawTxs]
    )
  );
}

/**
 * Fetches the subgraph url for a given contract on a given network.
 */
export function getContractSubgraph(params: { chainId: number; name: string }) {
  const result = contractData.find(
    contract =>
      contract.network === params.chainId.toString() &&
      contract.name === params.name
  );

  if (!result)
    throw new Error(
      `No subgraph url defined for ${params.name} on network ${params.chainId}`
    );

  return result.subgraph;
}

/**
 * A helper that wraps the getContractSubgraph function to return the subgraph url for the OptimisticGovernor contract on a given network.
 */
export function getOptimisticGovernorSubgraph(chainId: number): string {
  return getContractSubgraph({ chainId, name: 'OptimisticGovernor' });
}

/**
 * Returns the address of the Optimistic Governor contract deployment associated with a given treasury (Safe) from the graph.
 */
export const getModuleAddressForTreasury = async (
  chainId: number,
  treasuryAddress: string
) => {
  try {
    const subgraph = getOptimisticGovernorSubgraph(chainId);
    const query = gql`
      query ($treasuryAddress: String!) {
        safe(id: $treasuryAddress) {
          optimisticGovernor {
            id
          }
        }
      }
    `;

    type Result = {
      safe?: { optimisticGovernor?: { id: string } };
    };

    const client = new ApolloClient({
      uri: subgraph,
      cache: new InMemoryCache()
    });

    const { data } = await client.query({
      query,
      variables: {
        treasuryAddress: treasuryAddress.toLowerCase()
      }
    });

    return (data as Result).safe?.optimisticGovernor?.id ?? '';
  } catch (error) {
    console.warn(
      `Unable to get module address for treasury ${treasuryAddress} on network ${chainId}`
    );

    throw error;
  }
};

/**
 * Checks if a given treasury (Safe) has enabled oSnap.
 */
export const getIsOsnapEnabled = async (
  chainId: number,
  treasuryAddress: string
) => {
  try {
    const subgraph = getOptimisticGovernorSubgraph(chainId);
    const query = gql`
      query ($treasuryAddress: String!) {
        safe(id: $treasuryAddress) {
          isOptimisticGovernorEnabled
        }
      }
    `;

    type Result = {
      safe?: { isOptimisticGovernorEnabled?: boolean };
    };

    const client = new ApolloClient({
      uri: subgraph,
      cache: new InMemoryCache()
    });

    const { data } = await client.query({
      query,
      variables: {
        treasuryAddress: treasuryAddress.toLowerCase()
      }
    });

    return (data as Result).safe?.isOptimisticGovernorEnabled ?? false;
  } catch (error) {
    console.warn(
      `Unable to check if oSnap is enable for address ${treasuryAddress} on network ${chainId}`
    );

    throw error;
  }
};

/**
 * Fetches the details of a given proposal from the Optimistic Governor subgraph.
 *
 * The subgraph uses the `assertionId` that comes from assertion events as the primary key for proposals.
 * However, this `assertionId` will be deleted if the proposal is disputed, so we can't use it to query the subgraph.
 * Instead, we use the `proposalHash` and `explanation` to query the subgraph.
 * The `explanation` contains the ipfs url of the proposal, which is the only way to distinguish between proposals with the same `proposalHash`.
 * This means we must use a `where` clause to filter the results, which is not ideal.
 */
export async function getOgProposalGql(params: {
  chainId: number;
  explanation: string;
  moduleAddress: string;
  proposalHash: string;
}) {
  const { chainId, explanation, moduleAddress, proposalHash } = params;
  const encodedExplanation = pack(
    ['bytes'],
    [toUtf8Bytes(explanation.replace(/^0x/, ''))]
  );

  const subgraph = getOptimisticGovernorSubgraph(chainId);
  const query = gql`
    query (
      $proposalHash: String!
      $explanation: String!
      $moduleAddress: String!
    ) {
      proposals(
        where: {
          proposalHash: $proposalHash
          explanation: $explanation
          optimisticGovernor: $moduleAddress
        }
      ) {
        id
        executed
        deleted
        assertionId
        executionTransactionHash
      }
    }
  `;

  type Result = {
    proposals: {
      id: string;
      executed: boolean;
      assertionId: string;
      deleted: boolean;
      executionTransactionHash: string;
    }[];
  };

  const client = new ApolloClient({
    uri: subgraph,
    cache: new InMemoryCache()
  });

  const { data } = await client.query({
    query,
    variables: {
      proposalHash,
      explanation: encodedExplanation,
      moduleAddress
    }
  });

  return (data as Result).proposals[0];
}

/**
 * Check if a space's deployed (on-chain) settings are supported by oSnap bots for auto execution
 */
export async function isConfigCompliant(safeAddress: string, chainId: number) {
  const res = await fetch(
    `https://osnap.uma.xyz/api/space-config?address=${safeAddress}&chainId=${chainId}`
  );

  if (!res.ok) {
    throw new Error('Unable to fetch setting status');
  }
  const data = await res.json();
  return data as unknown as SpaceConfigResponse;
}
