import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export enum ProviderTypeDto {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
}

export class CreateProviderDto {
  @ApiProperty({ example: 'OpenAI' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    enum: ProviderTypeDto,
    example: ProviderTypeDto.OPENAI,
  })
  @IsEnum(ProviderTypeDto)
  type!: ProviderTypeDto;

  @ApiProperty({
    example: 'sk-example-key',
    required: false,
    description: 'Stored encrypted at rest',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({
    example: 'https://api.openai.com/v1',
    required: false,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiProperty({ example: 'gpt-4o-mini', required: false })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
