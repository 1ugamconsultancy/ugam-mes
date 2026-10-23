import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('equipment')
@UseGuards(AuthGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get('master')
  async getMasterEquipment() {
    return this.equipmentService.getMasterEquipment();
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Post('master')
  async createMasterEquipment(@Body() dto: any) {
    return this.equipmentService.createMasterEquipment(dto);
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Put('master/:id')
  async updateMasterEquipment(@Param('id') id: string, @Body() dto: any) {
    return this.equipmentService.updateMasterEquipment(id, dto);
  }

  @Roles('ADMIN')
  @Delete('master/:id')
  async deleteMasterEquipment(@Param('id') id: string) {
    return this.equipmentService.deleteMasterEquipment(id);
  }

  @Get('status')
  async getEquipmentStatuses() {
    return this.equipmentService.getEquipmentStatuses();
  }

  @Get('calibrations')
  async getCalibrations() {
    return this.equipmentService.getCalibrations();
  }

  @Roles('SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('calibrations')
  async addCalibration(@Body() dto: any) {
    return this.equipmentService.addCalibration(dto);
  }

  @Get('qualifications')
  async getQualifications() {
    return this.equipmentService.getQualifications();
  }

  @Roles('QUALITY_ENGINEER', 'ADMIN')
  @Post('qualifications')
  async addQualification(@Body() dto: any) {
    return this.equipmentService.addQualification(dto);
  }
}

