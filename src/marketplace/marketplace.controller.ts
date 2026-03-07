import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  MarketplaceService,
  type MarketplaceExecuteParams,
} from './marketplace.service';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

@Controller('marketplace')
@UseGuards(InternalAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('execute')
  async execute(@Body() body: MarketplaceExecuteParams) {
    console.log(`Executing request with body`, body);
    return this.marketplaceService.execute(body);
  }
}
