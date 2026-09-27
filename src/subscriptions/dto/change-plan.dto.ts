import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum SubscriptionPlanDto {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export class ChangePlanDto {
  @ApiProperty({
    enum: SubscriptionPlanDto,
    example: SubscriptionPlanDto.PREMIUM,
  })
  @IsEnum(SubscriptionPlanDto)
  plan!: SubscriptionPlanDto;
}
