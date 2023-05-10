// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";
import { IComp } from "../interfaces/IComp.sol";
import { TimestampResolver } from "../utils/TimestampResolver.sol";

/// @title Comp Voting Strategy
/// @notice Uses delegated balances of Comp style tokens to determine voting power.
contract CompVotingStrategy is IVotingStrategy, TimestampResolver {
    /// @notice Thrown when the byte array is not long enough to represent an address.
    error InvalidByteArray();

    /// @notice Returns the voting power of an address at a given timestamp.
    /// @param timestamp The snapshot timestamp to get the voting power at.
    /// @param voter The address to get the voting power of.
    /// @param params Parameter array containing the address of the Comp style token.
    function getVotingPower(
        uint32 timestamp,
        address voter,
        bytes calldata params,
        bytes calldata /* userParams */
    ) external override returns (uint256) {
        address tokenAddress = bytesToAddress(params, 0);
        uint256 blockNumber = resolveSnapshotTimestamp(timestamp);
        return uint256(IComp(tokenAddress).getPriorVotes(voter, blockNumber));
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
