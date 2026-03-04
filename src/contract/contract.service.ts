// Singleton ethers contract instances for every deployed contract. All other services inject this and call contracts directly with typed methods. Signing wallet (signerWallet) is used for write calls; provider alone for reads.
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// Once @blockchain-gods/contracts is published, replace these paths
import fujiDeployment from '../../deployments/fuji.json';
import { SoulToken__factory } from '../types/ethers-contracts/factories/SoulToken__factory';
import { GodsToken__factory } from '../types/ethers-contracts/factories/GodsToken__factory';
import { Treasury__factory } from '../types/ethers-contracts/factories/Treasury__factory';
import { PlayerRegistry__factory } from '../types/ethers-contracts/factories/PlayerRegistry__factory';
import { SBT__factory } from '../types/ethers-contracts/factories/SBT.sol/SBT__factory';
import { UpgradeNFT__factory } from '../types/ethers-contracts/factories/UpgradeNFT.sol/UpgradeNFT__factory';
import { Marketplace__factory } from '../types/ethers-contracts/factories/Marketplace.sol/Marketplace__factory';

import type { SoulToken } from '../types/ethers-contracts/SoulToken';
import type { GodsToken } from '../types/ethers-contracts/GodsToken';
import type { Treasury } from '../types/ethers-contracts/Treasury';
import type { PlayerRegistry } from '../types/ethers-contracts/PlayerRegistry';
import type { SBT } from '../types/ethers-contracts/SBT.sol/SBT';
import type { UpgradeNFT } from '../types/ethers-contracts/UpgradeNFT.sol/UpgradeNFT';
import type { Marketplace } from '../types/ethers-contracts/Marketplace.sol/Marketplace';

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);

  private provider: ethers.JsonRpcProvider;

  signerWallet: ethers.Wallet;
  faucetWallet: ethers.Wallet;

  soulToken: SoulToken;
  godsToken: GodsToken;
  treasury: Treasury;
  playerRegistry: PlayerRegistry;
  sbt: SBT;
  upgradeNFT: UpgradeNFT;
  marketplace: Marketplace;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const rpcUrl = this.config.get<string>('blockchain.fujiRpcUrl')!;
    const signerKey = this.config.get<string>('blockchain.signerPrivateKey')!;
    const faucetKey = this.config.get<string>('blockchain.faucetPrivateKey')!;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signerWallet = new ethers.Wallet(`0x${signerKey}`, this.provider);
    this.faucetWallet = new ethers.Wallet(`0x${faucetKey}`, this.provider);

    const { contracts } = fujiDeployment;

    this.soulToken = SoulToken__factory.connect(
      contracts.SoulToken,
      this.signerWallet,
    );
    this.godsToken = GodsToken__factory.connect(
      contracts.GodsToken,
      this.signerWallet,
    );
    this.treasury = Treasury__factory.connect(
      contracts.Treasury,
      this.signerWallet,
    );
    this.playerRegistry = PlayerRegistry__factory.connect(
      contracts.PlayerRegistry,
      this.signerWallet,
    );
    this.sbt = SBT__factory.connect(contracts.SBT, this.signerWallet);
    this.upgradeNFT = UpgradeNFT__factory.connect(
      contracts.UpgradeNFT,
      this.signerWallet,
    );
    this.marketplace = Marketplace__factory.connect(
      contracts.Marketplace,
      this.signerWallet,
    );

    this.logger.log(`ContractService initialised`);
    this.logger.log(`Signer: ${this.signerWallet.address}`);
    this.logger.log(`Faucet: ${this.faucetWallet.address}`);
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}
