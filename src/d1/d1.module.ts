import { Module } from '@nestjs/common';
import { D1Service } from './d1.service';

@Module({
  providers: [D1Service],
  exports: [D1Service],
})
export class D1Module {}
