import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from './database/database.module';
import { WaBotModule } from './wa-bot/wa-bot.module';
import { WebhookModule } from './webhook/webhook.module';
import { SystemLogModule } from './system-log/system-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    DatabaseModule,
    WaBotModule,
    WebhookModule,
    SystemLogModule,
  ],
})
export class AppModule {}
