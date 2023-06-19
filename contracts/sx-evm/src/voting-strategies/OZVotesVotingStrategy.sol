// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @title OZ Votes Voting Strategy
/// @notice Uses delegated balances of OZ Votes style tokens to determine voting power.
contract OZVotesVotingStrategy is IVotingStrategy {
    /// @notice Thrown when the byte array is not long enough to represent an address.
    error InvalidByteArray();

    /// @notice Returns the voting power of an address at a given block number.
    /// @param blockNumber The block number to get the voting power at.
    /// @param voter The address to get the voting power of.
    /// @param params Parameter array containing the address of the OZ Votes token.
    function getVotingPower(
        uint32 blockNumber,
        address voter,
        bytes calldata params,
        bytes calldata /* userParams */
    ) external view override returns (uint256) {
        address tokenAddress = bytesToAddress(params, 0);
        // We subract 1 from the block number so that when blockNumber == block.number,
        // getPastVotes can still be called.
        return uint256(IVotes(tokenAddress).getPastVotes(voter, blockNumber - 1));
    }

    /// @dev Extracts an address from a byte array.
    /// @dev Taken from the linked library, with the require switched for a revert statement:
    ///      https://github.com/GNSPS/solidity-bytes-utils/blob/master/contracts/BytesLib.sol
    function bytesToAddress(bytes memory _bytes, uint256 _start) internal pure returns (address) {
        if (_bytes.length < _start + 20) revert InvalidByteArray();
        address tempAddress;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            tempAddress := div(mload(add(add(_bytes, 0x20), _start)), 0x1000000000000000000000000)
        }

        return tempAddress;
    }
}
