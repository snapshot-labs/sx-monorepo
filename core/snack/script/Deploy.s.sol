// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/SnackFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        // Use Anvil account #1 as oracle by default
        address oracle = vm.envOr("ORACLE_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        vm.startBroadcast(deployerKey);

        MockUSDC usdc = new MockUSDC();
        SnackFactory factory = new SnackFactory(address(usdc), oracle);

        // Mint test USDC to first 3 Anvil accounts
        usdc.mint(address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266), 10_000e6);
        usdc.mint(address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8), 10_000e6);
        usdc.mint(address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC), 10_000e6);

        // Mint test USDC and send ETH to dev wallets
        usdc.mint(address(0xeF8305E140ac520225DAf050e2f71d5fBcC543e7), 10_000e6);
        usdc.mint(address(0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6), 10_000e6);
        payable(address(0xeF8305E140ac520225DAf050e2f71d5fBcC543e7)).transfer(10 ether);
        payable(address(0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6)).transfer(10 ether);

        vm.stopBroadcast();

        console.log("MockUSDC:", address(usdc));
        console.log("SnackFactory:", address(factory));
        console.log("Oracle:", oracle);
    }
}
