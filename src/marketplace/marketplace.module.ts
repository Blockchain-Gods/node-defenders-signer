import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { ContractModule } from '../contract/contract.module';
import { FaucetModule } from '../faucet/faucet.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ContractModule, FaucetModule, WalletModule],
  providers: [MarketplaceService],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
