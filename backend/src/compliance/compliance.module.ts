import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
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
  providers: [ComplianceService],
  controllers: [ComplianceController],
  exports: [ComplianceService, TypeOrmModule],
})
export class ComplianceModule {}
