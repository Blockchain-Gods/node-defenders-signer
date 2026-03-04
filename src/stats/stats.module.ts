import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { ContractModule } from '../contract/contract.module';
import { FaucetModule } from '../faucet/faucet.module';

@Module({
  imports: [ContractModule, FaucetModule],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
