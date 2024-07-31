import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';
import { contractData } from './constants';

type Network = string;

/**
 * Fetches the subgraph url for a given contract on a given network.
 */
export function getContractSubgraph(params: {
  network: Network;
  name: string;
}) {
  const result = contractData.find(
    contract =>
      contract.network === params.network && contract.name === params.name
  );

  if (!result)
    throw new Error(
      `No subgraph url defined for ${params.name} on network ${params.network}`
    );

  return result.subgraph;
}

/**
 * A helper that wraps the getContractSubgraph function to return the subgraph url for the OptimisticGovernor contract on a given network.
 */
export function getOptimisticGovernorSubgraph(network: Network): string {
  return getContractSubgraph({ network, name: 'OptimisticGovernor' });
}

/**
 * Returns the address of the Optimistic Governor contract deployment associated with a given treasury (Safe) from the graph.
 */
export const getModuleAddressForTreasury = async (
  network: Network,
  treasuryAddress: string
) => {
  try {
    const subgraph = getOptimisticGovernorSubgraph(network);
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
      `Unable to get module address for treasury ${treasuryAddress} on network ${network}`
    );

    throw error;
  }
};

/**
 * Checks if a given treasury (Safe) has enabled oSnap.
 */
export const getIsOsnapEnabled = async (
  network: Network,
  treasuryAddress: string
) => {
  try {
    const subgraph = getOptimisticGovernorSubgraph(network);
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
      `Unable to check if oSnap is enable for address ${treasuryAddress} on network ${network}`
    );

    throw error;
  }
};
