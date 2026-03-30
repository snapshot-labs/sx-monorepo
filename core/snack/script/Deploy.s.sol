// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SnackFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address oracle = vm.envOr("ORACLE_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        vm.startBroadcast(deployerKey);
        SnackFactory factory = new SnackFactory(oracle);
        vm.stopBroadcast();

        console.log("SnackFactory:", address(factory));
        console.log("Oracle:", oracle);
    }
}
