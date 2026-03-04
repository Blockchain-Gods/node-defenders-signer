import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { D1Module } from '../d1/d1.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [D1Module, EncryptionModule, ContractModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
