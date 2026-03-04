// Calls recordStats on PlayerRegistry. Since the contract has per-wallet recordStats (not a batch variant), this loops — acceptable for the beta batch sizes.

import { Injectable, Logger } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';
import { FaucetService } from '../faucet/faucet.service';

export interface StatEntry {
  wallet: string;
  games: number;
  rounds: number;
  enemies: number;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly contracts: ContractService,
    private readonly faucet: FaucetService,
  ) {}

  async recordBatchStats(entries: StatEntry[]): Promise<string[]> {
    await this.faucet.checkAndTopUp(this.contracts.signerWallet.address);
    const hashes: string[] = [];

    for (const entry of entries) {
      const tx = await this.contracts.playerRegistry.recordStats(
        entry.wallet,
        entry.games,
        entry.rounds,
        entry.enemies,
      );
      await tx.wait();
      hashes.push(tx.hash);
      this.logger.log(`Recorded stats for ${entry.wallet}. tx: ${tx.hash}`);
    }

    return hashes;
  }
}
