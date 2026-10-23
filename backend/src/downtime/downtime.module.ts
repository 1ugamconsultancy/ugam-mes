import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DowntimeController } from './downtime.controller';
import { DowntimeEvent } from './downtime-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DowntimeEvent])],
  controllers: [DowntimeController],
  exports: [TypeOrmModule],
})
export class DowntimeModule {}
