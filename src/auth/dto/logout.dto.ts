import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token for the session that should be revoked',
  })
  @IsString()
  refreshToken!: string;
}
