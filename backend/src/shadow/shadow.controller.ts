import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ShadowService } from './shadow.service';
import { ShadowIngestDto, ShadowAnalysisResult } from './shadow.dto';

@Controller('shadow')
@UseGuards(AuthGuard)
export class ShadowController {
  constructor(private readonly shadowService: ShadowService) {}

  @Post('ingest')
  ingestLog(@Body() dto: ShadowIngestDto): ShadowAnalysisResult {
    return this.shadowService.analyze(dto);
  }

  @Get('analysis')
  getAnalysis(@Query('domain') domain?: 'PHARMA' | 'AUTOMOTIVE'): ShadowAnalysisResult {
    return this.shadowService.getAnalysis(domain || 'PHARMA');
  }

  @Get('runs')
  getRuns(): ShadowAnalysisResult[] {
    return this.shadowService.getRuns();
  }
}
