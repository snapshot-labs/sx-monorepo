// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SnackFactory.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address oracle = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        SnackFactory factory = new SnackFactory(oracle);
        vm.stopBroadcast();

        console.log("SnackFactory:", address(factory));
        console.log("Oracle:", oracle);
    }
}
