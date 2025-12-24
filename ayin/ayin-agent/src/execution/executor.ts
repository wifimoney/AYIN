import { ethers } from 'ethers';
import { config } from '../config/config';
import { MarketSignal, Logger } from '../types';

export class Executor {
  private wallet: ethers.Wallet;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.operatorKey, provider);
  }

  async executeTrade(signal: MarketSignal) {
    // Placeholder: wire to PredictionMarket.executeTrade()
    this.logger.info('Executing trade', {
      marketId: signal.marketId,
      direction: signal.direction
    });

    // Example:
    // await contract.connect(this.wallet).executeTrade(...)
  }

  async payX402(
    to: string,
    amount: bigint
  ): Promise<{ transactionHash: string; blockNumber: number }> {
    this.logger.info('Executing x402 payment', {
      to,
      amount: amount.toString(),
    });

    const tx = await this.wallet.sendTransaction({
      to,
      value: amount,
      data: '0x',
    });

    const receipt = await tx.wait();
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  }
}