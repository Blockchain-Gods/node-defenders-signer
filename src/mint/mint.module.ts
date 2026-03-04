import { Module } from '@nestjs/common';
import { MintService } from './mint.service';
import { MintController } from './mint.controller';
import { D1Module } from '../d1/d1.module';
import { ContractModule } from '../contract/contract.module';
import { FaucetModule } from '../faucet/faucet.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [D1Module, ContractModule, FaucetModule, WalletModule],
  providers: [MintService],
  controllers: [MintController],
  exports: [MintService],
})
export class MintModule {}
