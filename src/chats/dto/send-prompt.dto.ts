import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendPromptDto {
  @ApiProperty({
    example: 'Explain retrieval-augmented generation simply.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  prompt!: string;

  @ApiProperty({
    required: false,
    description:
      'AI provider ID. If omitted, the configured default provider is used.',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({
    required: false,
    example: 'gpt-4o-mini',
    description:
      'Optional model override. Otherwise the provider default model is used.',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    required: false,
    description:
      'Existing conversation ID. Omit to start a new conversation.',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
