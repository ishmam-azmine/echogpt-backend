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
  @ApiResponse({ status: 201, description: 'AI provider created' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  create(@Body() dto: CreateProviderDto) {
    return this.providersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all configured AI providers' })
  @ApiResponse({ status: 200, description: 'Providers returned' })
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI provider' })
  @ApiResponse({ status: 200, description: 'Provider returned' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an AI provider' })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an AI provider' })
  @ApiResponse({ status: 200, description: 'Provider deleted' })
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable an AI provider' })
  @ApiResponse({ status: 200, description: 'Provider status changed' })
  toggle(@Param('id') id: string) {
    return this.providersService.toggle(id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set the default AI provider' })
  @ApiResponse({ status: 200, description: 'Default provider changed' })
  setDefault(@Param('id') id: string) {
    return this.providersService.setDefault(id);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Check connectivity and health of an AI provider',
  })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  health(@Param('id') id: string) {
    return this.providersService.health(id);
  }
}
