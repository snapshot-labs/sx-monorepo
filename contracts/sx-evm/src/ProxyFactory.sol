// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IProxyFactory } from "./interfaces/IProxyFactory.sol";

/// @title Proxy Factory
/// @notice A contract to deploy and track ERC1967 proxies of a given implementation contract.
contract ProxyFactory is IProxyFactory {
    /// @inheritdoc IProxyFactory
    function deployProxy(address implementation, bytes memory initializer, bytes32 salt) external override {
        if (implementation == address(0) || implementation.code.length == 0) revert InvalidImplementation();
        if (predictProxyAddress(implementation, salt).code.length > 0) revert SaltAlreadyUsed();
        address proxy = address(new ERC1967Proxy{ salt: salt }(implementation, ""));
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = proxy.call(initializer);
        if (!success) revert FailedInitialization();

        emit ProxyDeployed(implementation, proxy);
    }

    /// @inheritdoc IProxyFactory
    function predictProxyAddress(address implementation, bytes32 salt) public view override returns (address) {
        return
            address(
                uint160(
                    uint(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                address(this),
                                salt,
                                keccak256(
                                    abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(implementation, ""))
                                )
                            )
                        )
                    )
                )
            );
    }
}
