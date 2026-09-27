import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { ProvidersService } from './providers.service.js';

@ApiTags('AI Providers')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Add an AI provider' })
  @ApiResponse({
    status: 201,
    description: 'AI provider created successfully',
    schema: {
      example: {
        id: 'provider-uuid',
        name: 'OpenAI',
        type: 'OPENAI',
        defaultModel: 'gpt-4o-mini',
        isEnabled: true,
        isDefault: true,
        hasApiKey: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid provider data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'Provider already exists' })
  create(@Body() dto: CreateProviderDto) {
    return this.providersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all configured AI providers' })
  @ApiResponse({
    status: 200,
    description: 'Providers returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI provider' })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an AI provider' })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid provider data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Provider name already exists' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an AI provider' })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable an AI provider' })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider enabled/disabled successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  toggle(@Param('id') id: string) {
    return this.providersService.toggle(id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set the default AI provider' })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Default provider changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Provider cannot be set as default' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  setDefault(@Param('id') id: string) {
    return this.providersService.setDefault(id);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Check connectivity and health of an AI provider',
  })
  @ApiParam({
    name: 'id',
    description: 'AI provider UUID',
    example: '929f4f9b-bf33-414f-a165-cccda76158ce',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider health check completed',
    schema: {
      example: {
        provider: 'OpenAI',
        healthy: true,
        message: 'Provider is reachable',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  health(@Param('id') id: string) {
    return this.providersService.health(id);
  }
}