// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {DelegationPolicy} from "../src/DelegationPolicy.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {AyinSmartAccount} from "../src/AyinSmartAccount.sol";

/**
 * @title DeployScript
 * @notice Deployment script for AYIN contracts on Base network
 * @dev Deploys all core contracts and logs addresses for BaseScan verification
 */
contract DeployScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentRegistry (no constructor args)
        AgentRegistry agentRegistry = new AgentRegistry();
        console.log("===========================================");
        console.log("AgentRegistry deployed at:");
        console.log(address(agentRegistry));
        console.log("===========================================");

        // 2. Deploy DelegationPolicy (no constructor args)
        DelegationPolicy delegationPolicy = new DelegationPolicy();
        console.log("===========================================");
        console.log("DelegationPolicy deployed at:");
        console.log(address(delegationPolicy));
        console.log("===========================================");

        // 3. Deploy PredictionMarket
        // Constructor sets marketCreator to msg.sender (deployer)
        PredictionMarket predictionMarket = new PredictionMarket();
        console.log("===========================================");
        console.log("PredictionMarket deployed at:");
        console.log(address(predictionMarket));
        console.log("Market Creator:", deployer);
        console.log("===========================================");

        // 4. Deploy example AyinSmartAccount
        // Note: In production, users deploy their own smart accounts
        // This is just an example deployment
        address owner = vm.envOr("SMART_ACCOUNT_OWNER", deployer);
        AyinSmartAccount smartAccount = new AyinSmartAccount(
            address(delegationPolicy),
            address(agentRegistry),
            owner
        );
        console.log("===========================================");
        console.log("AyinSmartAccount (example) deployed at:");
        console.log(address(smartAccount));
        console.log("Owner:", owner);
        console.log("===========================================");

        // Summary
        console.log("\n===========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("===========================================");
        console.log("AgentRegistry:", address(agentRegistry));
        console.log("DelegationPolicy:", address(delegationPolicy));
        console.log("PredictionMarket:", address(predictionMarket));
        console.log("AyinSmartAccount (example):", address(smartAccount));
        console.log("===========================================");
        console.log("\nNext steps:");
        console.log("1. Update lib/contracts.ts with these addresses");
        console.log("2. Verify contracts on BaseScan");
        console.log("3. Test contract interactions");
        console.log("===========================================");

        vm.stopBroadcast();
    }
}

