import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseAbi, formatEther, keccak256, toHex, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const REGISTRY = (process.env.REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const METADATA_URI = process.env.METADATA_URI || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!process.env.PRIVATE_KEY) {
    console.error("Please set PRIVATE_KEY in .env");
    process.exit(1);
}

// Corrected ABI based on AgentRegistry.sol source
const ABI = parseAbi([
    'function registerAgent(address operator, bytes32 strategyHash, uint8 agentType) external returns (uint256)',
    'function getOperatorAgents(address operator) external view returns (uint256[])',
    'function getAgent(uint256 agentId) external view returns ((address operator, bytes32 strategyHash, uint8 agentType, uint256 registeredAt, bool exists))',
    'error InvalidAgentId()',
    'error AgentNotFound()',
    'error InvalidAgentType()'
]);

// Enum mapping from source
enum AgentType {
    DIRECTIONAL = 0,
    LIQUIDITY = 1,
    ARB = 2
}

async function main() {
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`);

    const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http()
    });

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
    });

    console.log(`Address: ${account.address}`);

    // 1. Check Balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${formatEther(balance)} ETH`);

    if (balance === BigInt(0)) {
        console.error("❌ Insufficient funds.");
        process.exit(1);
    }

    // 2. Generate Strategy Hash from Metadata URI
    // Since the contract expects bytes32, we hash the URI. 
    // This binds the onchain agent to the offchain metadata.
    const strategyHash = keccak256(toBytes(METADATA_URI));
    console.log(`Stategy Hash: ${strategyHash}`);

    // 3. Determine Agent Type
    // User JSON says "DIRECTIONAL". Contract Enum: DIRECTIONAL = 0.
    // User script had 1, but we fix it to 0 based on semantic intent.
    const agentType = AgentType.DIRECTIONAL;

    // 4. Check if already registered
    try {
        const agentIds = await publicClient.readContract({
            address: REGISTRY,
            abi: ABI,
            functionName: 'getOperatorAgents',
            args: [account.address]
        });
        console.log(`Current Agents Owned: ${agentIds.length}`);
        console.log(`IDs: ${agentIds.join(', ')}`);
    } catch (e) {
        console.warn("Could not fetch existing agents:", e);
    }

    // 5. Simulate Transaction
    console.log("\nSimulating registration...");
    try {
        const { result } = await publicClient.simulateContract({
            address: REGISTRY,
            abi: ABI,
            functionName: 'registerAgent',
            args: [account.address, strategyHash, agentType],
            account
        });
        console.log("Simulation success! New AgentID:", result);
    } catch (error: any) {
        console.error("❌ Simulation failed:");
        console.error(error.message || error);
        if (error.cause?.data) {
            console.error("Revert data:", error.cause.data);
        }
        // process.exit(1); // Don't exit, try sending anyway? No, revert is usually fatal.
        return;
    }

    // 6. Send Transaction
    console.log("\nSending transaction...");
    try {
        const hash = await client.writeContract({
            address: REGISTRY,
            abi: ABI,
            functionName: 'registerAgent',
            args: [account.address, strategyHash, agentType]
        });

        console.log(`⏳ Transaction sent: ${hash}`);
        console.log("Waiting for confirmation...");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log(`✅ Agent registered successfully! Block: ${receipt.blockNumber}`);
            console.log(`Tx: https://sepolia.basescan.org/tx/${receipt.transactionHash}`);
        } else {
            console.error("❌ Transaction failed");
        }
    } catch (error) {
        console.error("Error executing transaction:", error);
    }
}

main().catch(console.error);