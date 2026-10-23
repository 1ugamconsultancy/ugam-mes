import { Module } from '@nestjs/common';
import { OpcController } from './opc.controller';
import { OpcService } from './opc.service';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  imports: [EquipmentModule],
  controllers: [OpcController],
  providers: [OpcService],
  exports: [OpcService],
})
export class OpcModule {}
