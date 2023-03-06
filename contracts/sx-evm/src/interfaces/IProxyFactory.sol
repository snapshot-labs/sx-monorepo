// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProxyFactoryErrors } from "./factory/IProxyFactoryErrors.sol";
import { IProxyFactoryEvents } from "./factory/IProxyFactoryEvents.sol";

interface IProxyFactory is IProxyFactoryErrors, IProxyFactoryEvents {
    function deployProxy(address implementation, bytes memory initializer, bytes32 salt) external;

    function predictProxyAddress(address implementation, bytes32 salt) external view returns (address);
}
