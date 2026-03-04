import { Module } from '@nestjs/common';
import { FaucetService } from './faucet.service';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [ContractModule],
  providers: [FaucetService],
  exports: [FaucetService],
})
export class FaucetModule {}
