// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IProxyFactoryErrors {
    error SaltAlreadyUsed();
    error FailedInitialization();
    error InvalidImplementation();
}
