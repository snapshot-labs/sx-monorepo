// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../interfaces/IVotingStrategy.sol";
import "../interfaces/IComp.sol";
import "../utils/TimestampResolver.sol";

contract CompVotingStrategy is IVotingStrategy, TimestampResolver {
    error InvalidByteArray();

    function getVotingPower(
        uint32 timestamp,
        address voterAddress,
        bytes calldata params,
        bytes calldata /* userParams */
    ) external override returns (uint256) {
        address tokenAddress = BytesToAddress(params, 0);
        uint256 blockNumber = resolveSnapshotTimestamp(timestamp);
        return uint256(IComp(tokenAddress).getPriorVotes(voterAddress, blockNumber));
    }

    /// @notice Extracts an address from a byte array
    /// @param _bytes The byte array to extract the address from
    /// @param _start The index to start extracting the address from
    /// @dev Function from the library, with the require switched for a revert statement:
    /// https://github.com/GNSPS/solidity-bytes-utils/blob/master/contracts/BytesLib.sol
    function BytesToAddress(bytes memory _bytes, uint256 _start) internal pure returns (address) {
        if (_bytes.length < _start + 20) revert InvalidByteArray();
        address tempAddress;

        assembly {
            tempAddress := div(mload(add(add(_bytes, 0x20), _start)), 0x1000000000000000000000000)
        }

        return tempAddress;
    }
}
