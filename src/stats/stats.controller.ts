import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StatsService, StatEntry } from './stats.service';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

class BatchStatsDto {
  entries: StatEntry[];
}

@Controller('stats')
@UseGuards(InternalAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Post('batch')
  async recordBatch(@Body() body: BatchStatsDto) {
    const hashes = await this.statsService.recordBatchStats(body.entries);
    return { hashes };
  }
}
