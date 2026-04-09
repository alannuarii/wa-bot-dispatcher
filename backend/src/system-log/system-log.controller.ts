import { Controller, Get, Delete, Query } from '@nestjs/common';
import { SystemLogService } from './system-log.service';

@Controller('logs')
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get()
  async findAll(@Query('limit') limit?: string) {
    const rows = await this.systemLogService.findAll(
      limit ? parseInt(limit, 10) : 100,
    );
    // Map snake_case to camelCase for frontend compatibility
    return rows.map((row) => ({
      id: row.id,
      level: row.level,
      message: row.message,
      createdAt: row.created_at,
    }));
  }

  @Delete()
  clear() {
    return this.systemLogService.clear();
  }
}
