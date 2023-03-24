// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";

contract WhitelistStrategy is IVotingStrategy {
    struct Member {
        address addr;
        uint256 vp;
    }

    /**
     * @notice  Binary search through `members` to find the voting power of `voter`
     * @param   voter  The voter address
     * @param   params  The list of members. Needs to be sorted in ascending `addr` order
     * @return  uint256  The voting power of `voter` if it exists: else 0
     */
    function _getVotingPower(address voter, bytes calldata params) internal pure returns (uint256) {
        Member[] memory members = abi.decode(params, (Member[]));

        uint256 high = members.length - 1;
        uint256 low = 0;
        uint256 mid;
        address currentAddress;

        while (low < high) {
            mid = (high + low) / 2; // Expecting high and low to never overflow
            currentAddress = members[mid].addr;

            if (currentAddress < voter) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        if (high > members.length) {
            return (0);
        } else if (members[high].addr == voter) {
            return (members[high].vp);
        } else {
            return (0);
        }
    }

    function getVotingPower(
        uint32 /* timestamp */,
        address voter,
        bytes calldata params, // Need to be sorted by ascending `addr`s
        bytes calldata /* userParams */
    ) external pure override returns (uint256) {
        return _getVotingPower(voter, params);
    }
}
