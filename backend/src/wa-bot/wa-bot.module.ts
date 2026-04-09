import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WaBotService } from './wa-bot.service';
import {
  StatusController,
  BotController,
  GroupsController,
} from './wa-bot.controller';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
  imports: [HttpModule, SystemLogModule],
  controllers: [StatusController, BotController, GroupsController],
  providers: [WaBotService],
  exports: [WaBotService],
})
export class WaBotModule {}
