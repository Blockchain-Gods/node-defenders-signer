import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { D1Module } from './d1/d1.module';
import { EncryptionModule } from './encryption/encryption.module';
import { ContractModule } from './contract/contract.module';
import { WalletModule } from './wallet/wallet.module';
import { FaucetModule } from './faucet/faucet.module';
import { MintModule } from './mint/mint.module';
import { StatsModule } from './stats/stats.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    D1Module,
    EncryptionModule,
    ContractModule,
    WalletModule,
    FaucetModule,
    MintModule,
    StatsModule,
    MarketplaceModule,
  ],
})
export class AppModule {}
