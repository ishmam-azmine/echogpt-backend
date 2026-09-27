import {
  Body,
  Controller,
  Get,
  Param,
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
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AdminService } from './admin.service.js';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics returned',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  users() {
    return this.adminService.users();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  user(@Param('id') id: string) {
    return this.adminService.user(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(id, dto);
  }

  @Patch('users/:id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a user',
  })
  updateStatus(
    @CurrentUser() admin: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(
      admin.id,
      id,
      dto,
    );
  }

  @Patch('users/:id/subscription')
  @ApiOperation({
    summary: 'Manage a user subscription',
  })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(
      id,
      dto,
    );
  }

  @Get('analytics/usage')
  @ApiOperation({
    summary: 'Get API usage analytics',
  })
  usageAnalytics() {
    return this.adminService.usageAnalytics();
  }

  @Get('usage-logs')
  @ApiOperation({
    summary: 'Get recent API usage logs',
  })
  usageLogs() {
    return this.adminService.apiUsageLogs();
  }

  @Get('request-logs')
  @ApiOperation({
    summary: 'Get recent HTTP request logs',
  })
  requestLogs() {
    return this.adminService.requestLogs();
  }

  @Get('system/health')
  @ApiOperation({
    summary: 'Get application and database health',
  })
  systemHealth() {
    return this.adminService.systemHealth();
  }
}
