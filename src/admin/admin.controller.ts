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
  ApiParam,
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
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics returned',
    schema: {
      example: {
        users: { total: 25, active: 23, premium: 8 },
        providers: 3,
        conversations: 120,
        searches: 45,
        apiRequests: 310,
        failedRequests: 4,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({
    status: 200,
    description: 'Users returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  users() {
    return this.adminService.users();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '248bb8ce-c030-40bf-8636-c16a6bbaabfd',
  })
  @ApiResponse({
    status: 200,
    description: 'User details returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  user(@Param('id') id: string) {
    return this.adminService.user(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '248bb8ce-c030-40bf-8636-c16a6bbaabfd',
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid role data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(id, dto);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '248bb8ce-c030-40bf-8636-c16a6bbaabfd',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status change' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateStatus(
    @CurrentUser() admin: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(admin.id, id, dto);
  }

  @Patch('users/:id/subscription')
  @ApiOperation({ summary: 'Manage a user subscription' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '248bb8ce-c030-40bf-8636-c16a6bbaabfd',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid subscription data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(id, dto);
  }

  @Get('analytics/usage')
  @ApiOperation({ summary: 'Get API usage analytics' })
  @ApiResponse({
    status: 200,
    description: 'API usage analytics returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  usageAnalytics() {
    return this.adminService.usageAnalytics();
  }

  @Get('usage-logs')
  @ApiOperation({ summary: 'Get recent API usage logs' })
  @ApiResponse({
    status: 200,
    description: 'API usage logs returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  usageLogs() {
    return this.adminService.apiUsageLogs();
  }

  @Get('request-logs')
  @ApiOperation({ summary: 'Get recent HTTP request logs' })
  @ApiResponse({
    status: 200,
    description: 'HTTP request logs returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  requestLogs() {
    return this.adminService.requestLogs();
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get application and database health' })
  @ApiResponse({
    status: 200,
    description: 'System health information returned successfully',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  systemHealth() {
    return this.adminService.systemHealth();
  }
}