import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWebhookDto, UpdateWebhookDto } from './webhook.dto';

export interface WebhookRow {
  id: string;
  group_jid: string;
  group_name: string;
  target_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Map snake_case DB row to camelCase API response */
function toResponse(row: WebhookRow) {
  return {
    id: row.id,
    groupJid: row.group_jid,
    groupName: row.group_name,
    targetUrl: row.target_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class WebhookService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const result = await this.db.query<WebhookRow>(
      'SELECT * FROM webhook_registry ORDER BY created_at DESC',
    );
    return result.rows.map(toResponse);
  }

  async findOne(id: string) {
    const result = await this.db.query<WebhookRow>(
      'SELECT * FROM webhook_registry WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return toResponse(result.rows[0]);
  }

  async create(dto: CreateWebhookDto) {
    const result = await this.db.query<WebhookRow>(
      `INSERT INTO webhook_registry (group_jid, group_name, target_url, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.groupJid, dto.groupName, dto.targetUrl, dto.isActive ?? true],
    );
    return toResponse(result.rows[0]);
  }

  async update(id: string, dto: UpdateWebhookDto) {
    // Ensure exists
    await this.findOne(id);

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (dto.groupName !== undefined) {
      fields.push(`group_name = $${i++}`);
      values.push(dto.groupName);
    }
    if (dto.targetUrl !== undefined) {
      fields.push(`target_url = $${i++}`);
      values.push(dto.targetUrl);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(dto.isActive);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<WebhookRow>(
      `UPDATE webhook_registry SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return toResponse(result.rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    const result = await this.db.query<WebhookRow>(
      'DELETE FROM webhook_registry WHERE id = $1 RETURNING *',
      [id],
    );
    return toResponse(result.rows[0]);
  }
}
