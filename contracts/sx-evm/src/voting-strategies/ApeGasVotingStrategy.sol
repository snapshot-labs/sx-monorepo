// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";
import { ISatellite } from "@herodotus-evm-v2/interfaces/ISatellite.sol";
import { IEvmFactRegistryModule } from "@herodotus-evm-v2/interfaces/modules/IEvmFactRegistryModule.sol";

struct PackedTrieNode {
    uint256 data1;
    uint256 data2;
    uint256 data3;
}

struct VotingTrieParameters {
    bytes accountProof;
    address account;
    bool committmentHasDelegated;
    uint256 committmentVotingPower;
    PackedTrieNode[] nodes;
}

interface IApeChainVotingPower {
    function computeVotingPower(
        VotingTrieParameters calldata trieParams,
        uint256 blockNumber,
        bytes32 id,
        address delegateRegistry
    ) external view returns (uint256);
}

/// @title Ape Gas Voting Strategy
/// @notice Uses the Ape gas balance of a user to determine their voting power.
/// @notice Powered by Herodotus.
contract ApeGasVotingStrategy is IVotingStrategy {
    error InvalidVoter();

    function getVotingPower(
        uint32 l1BlockNumber, // `block.number` on Arbitrum L3s are the block numbers on mainnet
        address voter,
        bytes calldata params, // (uint256 l1ChainId, uint256 l3ChainId,
        //   address herodotusContract, address satellite, bytes32 id, address delegateRegistry)
        bytes calldata userParams // (VotingTrieParameters votingTrieParameters)
    ) external view override returns (uint256) {
        // Decode the parameters
        (
            uint256 l1ChainId,
            uint256 l3ChainId,
            address herodotusContractAddress,
            address satelliteAddress,
            bytes32 id, // Corresponds to the `id` used in the delegation registry
            address delegateRegistry
        ) = abi.decode(params, (uint256, uint256, address, address, bytes32, address));
        VotingTrieParameters memory votingTrieParameters = abi.decode(userParams, (VotingTrieParameters));

        // Get the contract instances
        IApeChainVotingPower herodotusContract = IApeChainVotingPower(herodotusContractAddress);
        ISatellite satellite = ISatellite(satelliteAddress);

        // Check if the voter is the same as the account in the votingTrieParameters
        if (voter != votingTrieParameters.account) {
            revert InvalidVoter();
        }

        uint256 l3BlockNumber = mapBlockNumberL1ToL3(satellite, l1ChainId, l1BlockNumber, l3ChainId);

        // Call the computeVotingPower function
        return herodotusContract.computeVotingPower(votingTrieParameters, l3BlockNumber, id, delegateRegistry);
    }

    /// @notice Maps an L1 block number to an L3 block number
    /// @notice Uses the satellite contract of herodotus to convert the L1 block number to
    ///   its corresponding timestamp, and then uses that timestamp to get the corresponding L3 block number.
    function mapBlockNumberL1ToL3(
        ISatellite satellite,
        uint256 l1ChainId,
        uint256 l1BlockNumber,
        uint256 l3ChainId
    ) public view returns (uint256 l3BlockNumber) {
        bytes32 timestampBytes = satellite.headerField(
            l1ChainId,
            l1BlockNumber,
            IEvmFactRegistryModule.BlockHeaderField.TIMESTAMP
        );
        uint256 timestamp = uint256(timestampBytes);
        l3BlockNumber = satellite.timestamp(l3ChainId, timestamp);
        return l3BlockNumber;
    }
}
