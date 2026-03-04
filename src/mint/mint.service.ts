// Handles on-demand mint and batch batchMint. The cron job drains pending_soul_mints from D1 every 5 minutes. On-demand mint is called directly from the API for immediate settlement (e.g. before a marketplace action).

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { D1Service } from '../d1/d1.service';
import { ContractService } from '../contract/contract.service';
import { FaucetService } from '../faucet/faucet.service';
import { WalletService } from '../wallet/wallet.service';

interface PendingMintRow {
  id: number;
  player_id: string;
  wallet_address: string;
  amount: string;
}

@Injectable()
export class MintService {
  private readonly logger = new Logger(MintService.name);
  private isBatchRunning = false;

  constructor(
    private readonly d1: D1Service,
    private readonly contracts: ContractService,
    private readonly faucet: FaucetService,
    private readonly wallets: WalletService,
    private readonly config: ConfigService,
  ) {}

  // Queue a mint to be settled on next cron tick
  async queueSoulMint(playerId: string, amount: bigint): Promise<void> {
    const address = await this.wallets.getAddressForPlayer(playerId);
    await this.d1.run(
      `INSERT INTO pending_soul_mints (player_id, wallet_address, amount) VALUES (?, ?, ?)`,
      [playerId, address, amount.toString()],
    );
  }

  // On-demand mint — used before marketplace actions
  async mintSoulNow(playerId: string, amount: bigint): Promise<string> {
    const address = await this.wallets.getAddressForPlayer(playerId);
    await this.faucet.checkAndTopUp(this.contracts.signerWallet.address);

    const tx = await this.contracts.soulToken.mint(address, amount);
    await tx.wait();

    this.logger.log(`Minted ${amount} SOUL to ${address}. tx: ${tx.hash}`);
    return tx.hash;
  }

  async mintSbt(playerId: string, typeId: number): Promise<string> {
    const address = await this.wallets.getAddressForPlayer(playerId);
    await this.faucet.checkAndTopUp(this.contracts.signerWallet.address);

    const tx = await this.contracts.sbt.mint(address, typeId);
    await tx.wait();

    this.logger.log(
      `Minted SBT typeId=${typeId} to ${address}. tx: ${tx.hash}`,
    );
    return tx.hash;
  }

  @Cron('*/5 * * * *')
  async runBatchMint(): Promise<void> {
    if (this.isBatchRunning) {
      this.logger.warn('Batch mint already running, skipping tick');
      return;
    }

    this.isBatchRunning = true;

    try {
      const result = await this.d1.query<PendingMintRow>(
        `SELECT id, player_id, wallet_address, amount FROM pending_soul_mints ORDER BY created_at ASC LIMIT 100`,
      );

      const rows = result.results;
      if (rows.length === 0) return;

      const recipients = rows.map((r) => r.wallet_address);
      const amounts = rows.map((r) => BigInt(r.amount));

      await this.faucet.checkAndTopUp(this.contracts.signerWallet.address);

      const tx = await this.contracts.soulToken.batchMint(recipients, amounts);
      await tx.wait();

      this.logger.log(`batchMint settled ${rows.length} mints. tx: ${tx.hash}`);

      const ids = rows.map((r) => r.id);
      await this.d1.run(
        `DELETE FROM pending_soul_mints WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids,
      );
    } catch (err) {
      this.logger.error('Batch mint failed', err);
    } finally {
      this.isBatchRunning = false;
    }
  }
}
