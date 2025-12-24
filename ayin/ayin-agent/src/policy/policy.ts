import { MarketSignal, DelegationPolicy } from '../types';

export function enforcePolicy(
  signal: MarketSignal,
  policy: DelegationPolicy
): boolean {
  if (!policy.allowedMarkets.includes(signal.marketId)) return false;
  if (Date.now() / 1000 > policy.expiresAt) return false;
  return true;
}