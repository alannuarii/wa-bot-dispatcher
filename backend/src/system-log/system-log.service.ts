import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SystemLogRow {
  id: string;
  level: string;
  message: string;
  created_at: Date;
}

@Injectable()
export class SystemLogService {
  constructor(private readonly db: DatabaseService) {}

  async log(level: 'INFO' | 'ERROR' | 'WARNING', message: string) {
    await this.db.query(
      'INSERT INTO system_log (level, message) VALUES ($1, $2)',
      [level, message],
    );
  }

  async findAll(limit = 100): Promise<SystemLogRow[]> {
    const result = await this.db.query<SystemLogRow>(
      'SELECT * FROM system_log ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    return result.rows;
  }

  async clear() {
    const result = await this.db.query('DELETE FROM system_log');
    return { count: result.rowCount };
  }
}
