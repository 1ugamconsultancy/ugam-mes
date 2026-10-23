import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryBalance } from './inventory-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryBalance])],
  controllers: [InventoryController],
  exports: [TypeOrmModule],
})
export class InventoryModule {}
