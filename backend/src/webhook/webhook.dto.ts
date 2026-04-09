import { IsString, IsBoolean, IsUrl, IsOptional } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  groupJid: string;

  @IsString()
  groupName: string;

  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  targetUrl: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  targetUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
