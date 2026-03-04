import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MintService } from './mint.service';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

class MintSoulDto {
  playerId: string;
  amount: string; // bigint as string over HTTP
}

class QueueSoulMintDto {
  playerId: string;
  amount: string;
}

class MintSbtDto {
  playerId: string;
  typeId: number;
}

@Controller('mint')
@UseGuards(InternalAuthGuard)
export class MintController {
  constructor(private readonly mintService: MintService) {}

  @Post('soul/now')
  async mintSoulNow(@Body() body: MintSoulDto) {
    const txHash = await this.mintService.mintSoulNow(
      body.playerId,
      BigInt(body.amount),
    );
    return { txHash };
  }

  @Post('soul/queue')
  async queueSoulMint(@Body() body: QueueSoulMintDto) {
    await this.mintService.queueSoulMint(body.playerId, BigInt(body.amount));
    return { queued: true };
  }

  @Post('sbt')
  async mintSbt(@Body() body: MintSbtDto) {
    const txHash = await this.mintService.mintSbt(body.playerId, body.typeId);
    return { txHash };
  }
}
