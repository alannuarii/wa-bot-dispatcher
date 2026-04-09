import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async onModuleInit() {
    // Test the connection
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log('✅ PostgreSQL connected successfully');
    } catch (err) {
      this.logger.error('❌ Failed to connect to PostgreSQL', err);
      throw err;
    }

    // Auto-create tables
    await this.initTables();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /** Run a parameterized query */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /** Get a client from the pool (for transactions) */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /** Create the database tables if they don't exist */
  private async initTables(): Promise<void> {
    const sql = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS webhook_registry (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_jid   VARCHAR(255) UNIQUE NOT NULL,
        group_name  VARCHAR(255) NOT NULL,
        target_url  TEXT NOT NULL,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_log (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        level       VARCHAR(20) NOT NULL,
        message     TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    try {
      await this.pool.query(sql);
      this.logger.log('✅ Database tables initialized');
    } catch (err) {
      this.logger.error('❌ Failed to initialize tables', err);
      throw err;
    }
  }
}
