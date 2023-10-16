// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { Deployer } from "../script/Deployer.s.sol";

contract DeployerTest is Test {
    Deployer deployer;

    bytes internal constant singletonFactoryBytecode =
        hex"6080604052348015600f57600080fd5b506004361060285760"
        hex"003560e01c80634af63f0214602d575b600080fd5b60cf6004"
        hex"8036036040811015604157600080fd5b810190602081018135"
        hex"640100000000811115605b57600080fd5b8201836020820111"
        hex"15606c57600080fd5b80359060200191846001830284011164"
        hex"010000000083111715608d57600080fd5b91908080601f0160"
        hex"20809104026020016040519081016040528093929190818152"
        hex"60200183838082843760009201919091525092955050913592"
        hex"5060eb915050565b604080516001600160a01b039092168252"
        hex"519081900360200190f35b6000818351602085016000f59392"
        hex"50505056fea26469706673582212206b44f8a82cb6b156bfcc"
        hex"3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f"
        hex"6c63430006020033";

    function setUp() public {
        vm.setEnv("NETWORK", "test");
        vm.setEnv("DEPLOYER_ADDRESS", vm.toString(address(this)));

        // Setting the bytecode at the singleton address of the singleton factory.
        vm.etch(address(0xce0042B868300000d44A59004Da54A005ffdcf9f), singletonFactoryBytecode);

        deployer = new Deployer();
    }

    function testDeployer() public {
        deployer.run();
    }
}
