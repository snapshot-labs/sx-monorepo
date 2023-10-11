// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";

/// @title Whitelist Voting Strategy
/// @notice Allows a variable voting power whitelist that is stored in a merkle tree to be used for voting power.
contract MerkleWhitelistVotingStrategy is IVotingStrategy {
    /// @notice Error thrown when the proof submitted is invalid.
    error InvalidProof();

    /// @notice Error thrown when the proof submitted does not correspond to the `voter` address.
    error InvalidMember();

    /// @dev The data for each member of the whitelist.
    struct Member {
        // The address of the member.
        address addr;
        // The voting power of the member.
        uint96 vp;
    }

    /// @notice Returns the voting power of an address.
    /// @param voter The address to get the voting power of.
    /// @param params Parameter array containing the root the merkle tree containing the whitelist.
    /// @param userParams Parameter array containing the desired member of the whitelist and its associated merkle proof.
    /// @return votingPower The voting power of the address if it exists in the whitelist, otherwise reverts.
    function getVotingPower(
        uint32 /* blockNumber */,
        address voter,
        bytes calldata params,
        bytes calldata userParams
    ) external pure override returns (uint256 votingPower) {
        bytes32 root = abi.decode(params, (bytes32));
        (bytes32[] memory proof, Member memory member) = abi.decode(userParams, (bytes32[], Member));

        if (member.addr != voter) revert InvalidMember();
        if (MerkleProof.verify(proof, root, keccak256(abi.encode(member))) != true) revert InvalidProof();

        return member.vp;
    }
}
