// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice Agent struct definition for reference
 * @dev This file contains struct definitions used across contracts
 */
struct Agent {
    address operator;          // Controller of the agent
    uint8 agentType;           // Directional / Liquidity / Arb
    bytes32 strategyHash;      // Commitment to strategy logic
    bytes32 metadataHash;      // Off-chain metadata (IPFS / Arweave)
    uint64 registeredAt;       // Timestamp
    bool active;               // Soft-disable flag
}
