import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchDto {
  @ApiProperty({
    example: 'Latest developments in artificial intelligence',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  query!: string;
}
