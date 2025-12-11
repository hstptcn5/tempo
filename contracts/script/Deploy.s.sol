// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BatchTransfer.sol";

contract DeployBatchTransfer is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy BatchTransfer
        BatchTransfer batchTransfer = new BatchTransfer();
        
        console.log("BatchTransfer deployed at:", address(batchTransfer));
        
        vm.stopBroadcast();
    }
}



