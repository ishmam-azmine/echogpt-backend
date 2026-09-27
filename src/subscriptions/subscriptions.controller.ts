import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator.js';
import { ChangePlanDto } from './dto/change-plan.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current subscription status and remaining requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSubscription(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.getSubscription(user.id);
  }

  @Get('me/usage')
  @ApiOperation({
    summary: 'Get API usage limit and remaining requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage information returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUsage(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.getUsage(user.id);
  }

  @Patch('me/plan')
  @ApiOperation({
    summary: 'Upgrade or downgrade the current subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or unchanged subscription plan',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePlan(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(user.id, dto);
  }
}
