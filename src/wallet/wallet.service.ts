// Generates a new ethers wallet, encrypts the private key, persists to D1. getSignerForPlayer is called by every other service before submitting a tx.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ethers } from 'ethers';
import { D1Service } from '../d1/d1.service';
import { EncryptionService } from '../encryption/encryption.service';
import { ContractService } from '../contract/contract.service';

interface WalletRow {
  player_id: string;
  address: string;
  encrypted_key: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly d1: D1Service,
    private readonly encryption: EncryptionService,
    private readonly contracts: ContractService,
  ) {}

  async createWallet(
    playerId: string,
  ): Promise<{ address: string; welcomeTokenId?: string }> {
    const existing = await this.findWallet(playerId);
    if (existing) {
      this.logger.warn(`Wallet already exists for player ${playerId}`);
      return { address: existing.address };
    }

    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = this.encryption.encrypt(wallet.privateKey.slice(2));
    await this.d1.run(
      `INSERT INTO wallets (player_id, address, encrypted_key) VALUES (?, ?, ?)`,
      [playerId, wallet.address, encryptedKey],
    );
    this.logger.log(`Created wallet for player ${playerId}: ${wallet.address}`);

    try {
      const tx = await this.contracts.playerRegistry
        .connect(this.contracts.signerWallet)
        .registerPlayer(wallet.address);
      await tx.wait();
      this.logger.log(`Player registered on-chain: ${wallet.address}`);
    } catch (err) {
      this.logger.error(
        `On-chain registration failed for ${wallet.address}`,
        err,
      );
    }

    let welcomeTokenId: string | undefined;
    try {
      const tx = await this.contracts.upgradeNFT
        .connect(this.contracts.signerWallet)
        .mint(wallet.address, 6);
      const receipt = await tx.wait();
      welcomeTokenId = this.extractWelcomeTokenId(receipt) ?? undefined;
      this.logger.log(
        `Welcome NFT minted for ${wallet.address}, tokenId: ${welcomeTokenId}`,
      );
    } catch (err) {
      this.logger.error(`Welcome NFT mint failed for ${wallet.address}`, err);
    }

    return { address: wallet.address, welcomeTokenId };
  }

  private extractWelcomeTokenId(
    receipt: ethers.TransactionReceipt | null,
  ): string | null {
    if (!receipt) return null;
    const transferLog = receipt.logs.find(
      (log) =>
        log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
        log.topics.length === 4,
    );
    return transferLog ? BigInt(transferLog.topics[3]).toString() : null;
  }

  async getSignerForPlayer(playerId: string): Promise<ethers.Wallet> {
    const row = await this.findWallet(playerId);
    if (!row)
      throw new NotFoundException(`No wallet found for player ${playerId}`);

    const privateKey = this.encryption.decrypt(row.encrypted_key);
    return new ethers.Wallet(`0x${privateKey}`, this.contracts.getProvider());
  }

  async getAddressForPlayer(playerId: string): Promise<string> {
    const row = await this.findWallet(playerId);
    if (!row)
      throw new NotFoundException(`No wallet found for player ${playerId}`);
    return row.address;
  }

  private async findWallet(playerId: string): Promise<WalletRow | null> {
    const result = await this.d1.query<WalletRow>(
      `SELECT player_id, address, encrypted_key FROM wallets WHERE player_id = ?`,
      [playerId],
    );
    return result.results[0] ?? null;
  }
}
