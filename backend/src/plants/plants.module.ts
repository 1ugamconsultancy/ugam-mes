import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantsService } from './plants.service';
import { PlantsController } from './plants.controller';
import { Plant, Area, Line, Machine } from './plants.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plant, Area, Line, Machine])],
  providers: [PlantsService],
  controllers: [PlantsController],
  exports: [PlantsService, TypeOrmModule],
})
export class PlantsModule {}
