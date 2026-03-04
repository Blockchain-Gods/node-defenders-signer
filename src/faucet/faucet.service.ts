// Called before every outbound transaction. Checks player wallet AVAX balance and tops up from the faucet wallet if below threshold.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class FaucetService {
  private readonly logger = new Logger(FaucetService.name);

  constructor(
    private readonly contracts: ContractService,
    private readonly config: ConfigService,
  ) {}

  async checkAndTopUp(walletAddress: string): Promise<void> {
    const provider = this.contracts.getProvider();
    const balance = await provider.getBalance(walletAddress);
    const threshold = ethers.parseEther(
      this.config.get<string>('blockchain.faucetThresholdAvax') ?? '0.05',
    );

    if (balance >= threshold) return;

    const topupAmount = ethers.parseEther(
      this.config.get<string>('blockchain.faucetTopupAmountAvax') ?? '0.1',
    );

    this.logger.log(
      `Topping up ${walletAddress} — balance: ${ethers.formatEther(balance)} AVAX`,
    );

    const tx = await this.contracts.faucetWallet.sendTransaction({
      to: walletAddress,
      value: topupAmount,
    });

    await tx.wait();
    this.logger.log(`Top-up confirmed. tx: ${tx.hash}`);
  }
}
