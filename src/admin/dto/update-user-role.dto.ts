import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: ['USER', 'ADMIN'],
    example: 'ADMIN',
  })
  @IsIn(['USER', 'ADMIN'])
  role!: 'USER' | 'ADMIN';
}
