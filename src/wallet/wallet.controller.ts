import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

class CreateWalletDto {
  playerId: string;
}

@Controller('wallet')
@UseGuards(InternalAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  async createWallet(@Body() body: CreateWalletDto) {
    return this.walletService.createWallet(body.playerId);
  }
}
