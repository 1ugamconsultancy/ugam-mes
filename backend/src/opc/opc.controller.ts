import { Roles } from '../auth/roles.decorator';
import { OpcWriteDto, OpcCreateDto, OpcConfigDto } from './opc.dto';
import { Controller, Get, Post, Put, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { OpcService } from './opc.service';
import { WriteTagDto, CreateTagDto, KepwareServerConfig } from './opc.entity';

@Controller('opc')
export class OpcController {
  constructor(private readonly opcService: OpcService) {}

  @Get('tags')
  async getTags(@Query('equipment') equipment?: string) {
    const tags = await this.opcService.getTags();
    if (equipment && equipment !== 'ALL') {
      return tags.filter((t) => t.equipmentCode.toUpperCase() === equipment.toUpperCase());
    }
    return tags;
  }

  @Get('tags/:tagName')
  async getTag(@Param('tagName') tagName: string) {
    const tag = await this.opcService.getTag(tagName);
    if (!tag) {
      throw new HttpException(`Tag "${tagName}" not found`, HttpStatus.NOT_FOUND);
    }
    return tag;
  }

  @Get('server')
  async getServerConfig() {
    return this.opcService.getServerConfig();
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('server/config')
  async updateServerConfig(@Body() body: OpcConfigDto) {
    return this.opcService.updateServerConfig(body);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('server/test')
  async testConnection(@Body() body: { endpointUrl?: string }) {
    return this.opcService.testConnection(body.endpointUrl);
  }

  @Roles('SUPERVISOR', 'PRODUCTION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @Post('write')
  async writeTag(@Body() body: OpcWriteDto) {
    if (!body || !body.tagName) {
      throw new HttpException('tagName and value are required in payload', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.opcService.writeTag(body);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('OPC request failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('tags')
  async createTag(@Body() body: OpcCreateDto) {
    if (!body || !body.tagName || !body.equipmentCode || !body.dataType || !body.accessMode) {
      throw new HttpException('Missing required fields for OPC tag registration', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.opcService.createTag(body);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('OPC request failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('sync')
  async syncAll() {
    return this.opcService.syncAllTags();
  }

  @Roles('QUALITY_ENGINEER', 'PRODUCTION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @Get('logs')
  async getAuditLogs(@Query('limit') limit?: string) {
    const count = limit ? parseInt(limit, 10) : 100;
    return this.opcService.getAuditLogs(count);
  }
}
