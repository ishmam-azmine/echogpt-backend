import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AdminUpdateSubscriptionDto {
  @ApiProperty({
    enum: ['FREE', 'PREMIUM'],
    example: 'PREMIUM',
  })
  @IsIn(['FREE', 'PREMIUM'])
  plan!: 'FREE' | 'PREMIUM';
}
