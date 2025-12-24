import 'dotenv/config';

export const config = {
  agentId: Number(process.env.AGENT_ID),
  operatorKey: process.env.OPERATOR_PRIVATE_KEY!,
  rpcUrl: process.env.RPC_URL!,
  delegationPolicyAddress: process.env.DELEGATION_POLICY!,
  predictionMarketAddress: process.env.PREDICTION_MARKET!,
  pollIntervalMs: 30_000
};

if (!config.operatorKey) {
  throw new Error('Missing OPERATOR_PRIVATE_KEY');
}