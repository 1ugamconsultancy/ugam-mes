import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OeeService } from './oee.service';
import { ProductionGateway } from './production.gateway';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { ProductionLog } from './production-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionLog])],
  providers: [OeeService, ProductionGateway, ProductionService],
  controllers: [ProductionController],
  exports: [OeeService, ProductionGateway, ProductionService, TypeOrmModule],
})
export class ProductionModule {}
