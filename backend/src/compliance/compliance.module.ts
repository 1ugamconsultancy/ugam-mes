import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { ValidationEngineService } from './validation-engine.service';
import { User } from '../auth/user.entity';
import {
  ElectronicSignature,
  AuditTrail,
  Deviation,
  Capa,
  ChangeControl,
  DocumentManagement
} from './compliance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ElectronicSignature,
      AuditTrail,
      Deviation,
      Capa,
      ChangeControl,
      DocumentManagement
    ]),
  ],
  providers: [ComplianceService, ValidationEngineService],
  controllers: [ComplianceController],
  exports: [ComplianceService, ValidationEngineService, TypeOrmModule],
})
export class ComplianceModule {}
