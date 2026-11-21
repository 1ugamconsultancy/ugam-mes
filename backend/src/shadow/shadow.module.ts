import { Module } from '@nestjs/common';
import { ShadowService } from './shadow.service';
import { ShadowController } from './shadow.controller';

@Module({
  controllers: [ShadowController],
  providers: [ShadowService],
  exports: [ShadowService],
})
export class ShadowModule {}
