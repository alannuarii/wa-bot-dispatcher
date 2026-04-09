import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { WaBotService } from './wa-bot.service';

@Controller('status')
export class StatusController {
  constructor(private readonly waBotService: WaBotService) {}

  @Get()
  getStatus() {
    return {
      status: this.waBotService.getStatus(),
      qrCode: this.waBotService.getQrCode(),
    };
  }
}

@Controller('bot')
export class BotController {
  constructor(private readonly waBotService: WaBotService) {}

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  async restart() {
    await this.waBotService.restart();
    return { message: 'Bot restart initiated' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.waBotService.logout();
    return { message: 'Bot session cleared' };
  }
}

@Controller('groups')
export class GroupsController {
  constructor(private readonly waBotService: WaBotService) {}

  @Get()
  async getGroups() {
    return this.waBotService.getGroups();
  }
}
