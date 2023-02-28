// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@zodiac/interfaces/IAvatar.sol";

contract Avatar {
    error NotAuthorized();

    mapping(address module => bool isEnabled) internal modules;

    receive() external payable {}

    function enableModule(address _module) external {
        modules[_module] = true;
    }

    function disableModule(address _module) external {
        modules[_module] = false;
    }

    function isModuleEnabled(address _module) external view returns (bool) {
        if (modules[_module]) {
            return true;
        } else {
            return false;
        }
    }

    function execTransactionFromModule(
        address payable to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external returns (bool success) {
        if (!modules[msg.sender]) revert NotAuthorized();
        if (operation == 1) (success, ) = to.delegatecall(data);
        else (success, ) = to.call{ value: value }(data);
    }

    function getModulesPaginated(
        address,
        uint256 pageSize
    ) external view returns (address[] memory array, address next) {
        // Unimplemented
        return (new address[](0), address(0));
    }
}
