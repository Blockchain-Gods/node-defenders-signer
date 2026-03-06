// Handles buyUpgrade and rentUpgrade. Builds the EIP-2612 permit signature for SOUL before calling the Marketplace contract, so the player wallet approves spend in the same flow.

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractService } from '../contract/contract.service';
import { FaucetService } from '../faucet/faucet.service';
import { WalletService } from '../wallet/wallet.service';

export type PaymentToken = 'SOUL' | 'GODS';

export interface MarketplaceExecuteParams {
  playerId: string;
  action: 'buy' | 'rent';
  typeId: number;
  tierId?: number; // required for rent
  paymentToken: PaymentToken;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly contracts: ContractService,
    private readonly faucet: FaucetService,
    private readonly wallets: WalletService,
  ) {}

  async execute(
    params: MarketplaceExecuteParams,
  ): Promise<{ txHash: string; tokenId: string }> {
    const { playerId, action, typeId, tierId, paymentToken } = params;

    const playerWallet = await this.wallets.getSignerForPlayer(playerId);
    await this.faucet.checkAndTopUp(playerWallet.address);

    const paymentAddress =
      paymentToken === 'SOUL'
        ? await this.contracts.soulToken.getAddress()
        : await this.contracts.treasury.godsToken();

    if (paymentToken === 'SOUL') {
      await this.buildAndSubmitPermit(playerWallet, action, typeId, tierId);
    }

    let tx: ethers.ContractTransactionResponse;
    let tokenId: string;

    if (action === 'buy') {
      tx = await this.contracts.marketplace
        .connect(this.contracts.signerWallet) // signer has OPERATOR_ROLE
        .buyUpgrade(playerWallet.address, typeId, paymentAddress);
      const receipt = await tx.wait();
      tokenId = this.extractTokenId(receipt);
    } else {
      if (tierId === undefined) throw new Error('tierId required for rent');
      tx = await this.contracts.marketplace
        .connect(this.contracts.signerWallet) // signer has OPERATOR_ROLE
        .rentUpgrade(playerWallet.address, typeId, tierId, paymentAddress);
      const receipt = await tx.wait();
      tokenId = this.extractTokenId(receipt);
    }

    this.logger.log(
      `Marketplace ${action} complete. tokenId: ${tokenId}. tx: ${tx.hash}`,
    );
    return { txHash: tx.hash, tokenId };
  }

  private async buildAndSubmitPermit(
    playerWallet: ethers.Wallet,
    action: 'buy' | 'rent',
    typeId: number,
    tierId?: number,
  ): Promise<void> {
    const marketplaceAddress = await this.contracts.marketplace.getAddress();
    const soulAddress = await this.contracts.soulToken.getAddress();

    const [cost] =
      action === 'buy'
        ? await this.contracts.marketplace.computeBuyCost(typeId, soulAddress)
        : await this.contracts.marketplace.computeRentCost(
            tierId!,
            soulAddress,
          );

    const nonce = await this.contracts.soulToken.nonces(playerWallet.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    const domain = {
      name: 'Soul',
      version: '1',
      chainId: 43113,
      verifyingContract: soulAddress,
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      owner: playerWallet.address,
      spender: marketplaceAddress,
      value: cost,
      nonce,
      deadline,
    };

    const sig = await playerWallet.signTypedData(domain, types, value);
    const { v, r, s } = ethers.Signature.from(sig);

    await this.contracts.soulToken
      .connect(playerWallet)
      .permit(
        playerWallet.address,
        marketplaceAddress,
        cost,
        deadline,
        v,
        r,
        s,
      );
  }

  private extractTokenId(receipt: ethers.TransactionReceipt | null): string {
    if (!receipt) throw new Error('No receipt from marketplace tx');

    // Try topics[3] first (indexed tokenId in Transfer event)
    const transferLog = receipt.logs.find(
      (log) =>
        log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
        log.topics.length === 4,
    );

    if (transferLog) {
      return BigInt(transferLog.topics[3]).toString();
    }

    // Fallback: decode from UpgradeNFT Minted/Transfer event data
    const anyTransfer = receipt.logs.find(
      (log) => log.topics[0] === ethers.id('Transfer(address,address,uint256)'),
    );

    if (!anyTransfer) throw new Error('No Transfer event found in receipt');

    // tokenId may be in data if not indexed
    return BigInt(anyTransfer.data).toString();
  }
}
