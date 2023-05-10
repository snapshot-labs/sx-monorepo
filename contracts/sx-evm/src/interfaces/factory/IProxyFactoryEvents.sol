// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/// @title Proxy Factory Events
interface IProxyFactoryEvents {
    /// @notice Emitted when a new proxy is deployed.
    /// @param implementation The address of the implementation contract.
    /// @param proxy The address of the proxy contract, determined via CREATE2.
    event ProxyDeployed(address implementation, address proxy);
}
