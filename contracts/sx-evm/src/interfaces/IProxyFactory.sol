// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProxyFactoryErrors } from "./factory/IProxyFactoryErrors.sol";
import { IProxyFactoryEvents } from "./factory/IProxyFactoryEvents.sol";

/// @title Proxy Factory Interface
interface IProxyFactory is IProxyFactoryErrors, IProxyFactoryEvents {
    /// @notice Deploys a proxy contract using the given implementation and initializer function call.
    /// @param implementation The address of the implementation contract.
    /// @param initializer ABI encoded function call to initialize the proxy.
    function deployProxy(address implementation, bytes memory initializer, bytes32 salt) external;

    /// @notice Predicts the CREATE2 address of a proxy contract.
    /// @param implementation The address of the implementation contract.
    /// @param salt The CREATE2 salt used.
    function predictProxyAddress(address implementation, bytes32 salt) external view returns (address);
}
