import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { DowntimeEvent } from './downtime-event.entity';

@Controller('downtime')
@UseGuards(AuthGuard)
export class DowntimeController {
  constructor(
    @InjectRepository(DowntimeEvent)
    private downtimeRepository: Repository<DowntimeEvent>,
  ) {}

  private mapEvent(e: DowntimeEvent) {
    if (!e) return null;
    return {
      id: e.id,
      machineId: e.machineId,
      machineCode: e.machine?.code || 'MOCK-MC',
      reasonCode: e.reasonCode,
      startedAt: e.startedAt,
      endedAt: e.endedAt || undefined,
      isPlanned: e.isPlanned,
      comments: e.comments,
      status: e.approvedBy ? 'APPROVED' : 'PENDING_APPROVAL',
    };
  }

  @Get('events')
  async getEvents() {
    const events = await this.downtimeRepository.find({
      relations: ['machine'],
      order: { startedAt: 'DESC' },
    });
    return events.map(e => this.mapEvent(e));
  }

  @Roles('OPERATOR', 'SUPERVISOR', 'ADMIN')
  @Post('report')
  async reportDowntime(@Body() dto: Partial<DowntimeEvent>, @Req() req: any) {
    const newEvent = this.downtimeRepository.create({
      machineId: dto.machineId || 'a1111111-1111-1111-1111-111111111111',
      reasonCode: dto.reasonCode || 'Unscheduled Stop',
      startedAt: new Date(),
      isPlanned: dto.isPlanned || false,
      comments: dto.comments,
      reportedBy: req.user?.sub,
    });
    const saved = await this.downtimeRepository.save(newEvent);
    const reloaded = await this.downtimeRepository.findOne({
      where: { id: saved.id },
      relations: ['machine'],
    });
    return this.mapEvent(reloaded);
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Patch('events/:id/resolve')
  async resolveDowntime(@Param('id') id: string, @Body('comments') comments: string) {
    const ev = await this.downtimeRepository.findOne({
      where: { id },
      relations: ['machine'],
    });
    if (ev) {
      ev.endedAt = new Date();
      if (comments) ev.comments = comments;
      await this.downtimeRepository.save(ev);
    }
    return this.mapEvent(ev);
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Patch('events/:id/approve')
  async approveDowntime(@Param('id') id: string, @Req() req: any) {
    const ev = await this.downtimeRepository.findOne({
      where: { id },
      relations: ['machine'],
    });
    if (ev) {
      ev.approvedBy = req.user?.sub || '33333333-3333-3333-3333-333333333333';
      await this.downtimeRepository.save(ev);
    }
    return this.mapEvent(ev);
  }

  @Get('analytics/reasons')
  async getDowntimeReasonsAnalytics() {
    return [
      { name: 'Mechanical Breakdown', durationHours: 14.5 },
      { name: 'Nozzle Clog', durationHours: 8.2 },
      { name: 'Feeder Jam', durationHours: 5.4 },
      { name: 'Material Shortage', durationHours: 4.1 },
      { name: 'Scheduled Setup/Changeover', durationHours: 12.0 },
    ];
  }
}
