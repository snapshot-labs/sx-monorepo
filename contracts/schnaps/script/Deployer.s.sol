// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.21;

import "forge-std/Script.sol";
import "../src/Schnaps.sol";

interface ICREATE3Factory {
    function deploy(bytes32 salt, bytes memory bytecode) external payable returns (address deployedAddress);
}

contract Deployer is Script {
    using stdJson for string;

    string internal deployments;
    string internal deploymentsPath;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory network = vm.envString("NETWORK");
        address owner = vm.envAddress("OWNER");

        // We use the latest commit hash as the salt for CREATE3 deployment
        // Prepended with `00` to remove any solc warning.
        uint256 LATEST_COMMIT = 0x001c4e0dc5f4b21c01f2c189357c0cf3f9f282f5cc;

        deploymentsPath = string.concat(string.concat("./deployments/", network), ".json");

        vm.startBroadcast(deployerPrivateKey);

        // Using the CREATE3 factory maintained by lififinance: https://github.com/lifinance/create3-factory
        address deployed = ICREATE3Factory(0x93FEC2C00BfE902F733B57c5a6CeeD7CD1384AE1).deploy(
            bytes32(LATEST_COMMIT), abi.encodePacked(type(Schnaps).creationCode, abi.encode(owner))
        );

        deployments = deployments.serialize("Schnaps", deployed);

        deployments.write(deploymentsPath);

        vm.stopBroadcast();
    }
}
