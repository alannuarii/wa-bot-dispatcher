import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '../database/database.service';
import { SystemLogService } from '../system-log/system-log.service';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';
import pino from 'pino';

// Create a pino logger compatible with Baileys (requires trace, debug, info, warn, error, fatal)
const baileysLogger = pino({ level: 'silent' }); // Use 'debug' or 'info' to see Baileys internal logs

export type BotStatus = 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'CONNECTING';

@Injectable()
export class WaBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WaBotService.name);
  private sock: WASocket | null = null;
  private status: BotStatus = 'DISCONNECTED';
  private qrCodeBase64: string | null = null;
  private readonly authFolder: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly httpService: HttpService,
    private readonly systemLogService: SystemLogService,
  ) {
    this.authFolder = path.resolve(
      process.env.BAILEYS_AUTH_FOLDER || './auth_info_baileys',
    );
  }

  async onModuleInit() {
    await this.connectToWhatsApp();
  }

  async onModuleDestroy() {
    this.sock?.end(undefined);
  }

  // ─── Public Accessors ───────────────────────────────────────

  getStatus(): BotStatus {
    return this.status;
  }

  getQrCode(): string | null {
    return this.qrCodeBase64;
  }

  // ─── Bot Control ────────────────────────────────────────────

  async restart(): Promise<void> {
    this.logger.warn('Restarting bot connection…');
    await this.systemLogService.log('WARNING', 'Bot restart requested');
    this.sock?.end(undefined);
    this.sock = null;
    this.status = 'DISCONNECTED';
    this.qrCodeBase64 = null;
    await this.connectToWhatsApp();
  }

  async logout(): Promise<void> {
    this.logger.warn('Logging out bot session…');
    await this.systemLogService.log('WARNING', 'Bot logout requested – session cleared');
    try {
      await this.sock?.logout();
    } catch {
      // already logged out or never connected
    }
    this.sock = null;
    this.status = 'DISCONNECTED';
    this.qrCodeBase64 = null;

    // Remove auth folder so QR scan is needed again
    if (fs.existsSync(this.authFolder)) {
      fs.rmSync(this.authFolder, { recursive: true, force: true });
    }
  }

  // ─── Group List ─────────────────────────────────────────────

  async getGroups(): Promise<
    { id: string; subject: string; participants: number }[]
  > {
    if (!this.sock || this.status !== 'CONNECTED') return [];
    try {
      const groups = await this.sock.groupFetchAllParticipating();
      return Object.values(groups).map((g) => ({
        id: g.id,
        subject: g.subject,
        participants: g.participants?.length ?? 0,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch groups', err);
      return [];
    }
  }

  // ─── Core Connection ───────────────────────────────────────

  private async connectToWhatsApp(): Promise<void> {
    this.status = 'CONNECTING';
    this.qrCodeBase64 = null;

    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger: baileysLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      generateHighQualityLinkPreview: false,
    });

    // ── Connection Update ──────────────────────────────────
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCodeBase64 = await QRCode.toDataURL(qr);
        this.status = 'QR_READY';
        this.logger.log('QR code generated – waiting for scan');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.logger.warn(
          `Connection closed (status ${statusCode}). Reconnecting: ${shouldReconnect}`,
        );
        this.status = 'DISCONNECTED';
        this.qrCodeBase64 = null;

        try {
          await this.systemLogService.log(
            'WARNING',
            `Connection closed (status ${statusCode}). Reconnecting: ${shouldReconnect}`,
          );
        } catch (err) {
          this.logger.error('Failed to log connection close event', err);
        }

        if (shouldReconnect) {
          setTimeout(() => this.connectToWhatsApp(), 3000);
        }
      } else if (connection === 'open') {
        this.status = 'CONNECTED';
        this.qrCodeBase64 = null;
        this.logger.log('✅ WhatsApp connection opened successfully');
        try {
          await this.systemLogService.log('INFO', 'WhatsApp connection opened');
        } catch (err) {
          this.logger.error('Failed to log connection open event', err);
        }
      }
    });

    // ── Credentials Update ─────────────────────────────────
    this.sock.ev.on('creds.update', saveCreds);

    // ── Message Listener & Dispatch ────────────────────────
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          await this.handleIncomingMessage(msg);
        } catch (err) {
          this.logger.error('Error handling message', err);
        }
      }
    });
  }

  // ─── Message Handler ───────────────────────────────────────

  private async handleIncomingMessage(msg: any): Promise<void> {
    const remoteJid = msg.key.remoteJid;
    this.logger.debug(`Received message from: ${remoteJid}`);

    if (!remoteJid || !remoteJid.endsWith('@g.us')) return; // Only group messages
    if (msg.key.fromMe) return; // Ignore own messages

    // Look up webhook registry for this group
    const result = await this.db.query(
      'SELECT * FROM webhook_registry WHERE group_jid = $1 AND is_active = true LIMIT 1',
      [remoteJid],
    );

    if (result.rows.length === 0) {
      this.logger.debug(`No active webhook found for group: ${remoteJid}`);
      return;
    }
    const registry = result.rows[0];

    // Extract text content
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    const messageType = msg.message
      ? Object.keys(msg.message)[0]
      : 'unknown';

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || '';

    const payload = {
      event: 'message.group',
      data: {
        messageId: msg.key.id,
        groupJid: remoteJid,
        senderJid,
        senderName,
        timestamp: msg.messageTimestamp,
        messageType,
        text,
      },
    };

    this.logger.log(
      `Dispatching message from group ${registry.group_name} → ${registry.target_url}`,
    );

    // Fire-and-forget POST request
    try {
      await firstValueFrom(
        this.httpService.post(registry.target_url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );
      await this.systemLogService.log(
        'INFO',
        `Message dispatched to ${registry.target_url} from group ${registry.group_name}`,
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      this.logger.error(
        `Failed to dispatch to ${registry.target_url}: ${errorMessage}`,
      );
      await this.systemLogService.log(
        'ERROR',
        `Failed dispatch to ${registry.target_url}: ${errorMessage}`,
      );
    }
  }
}
