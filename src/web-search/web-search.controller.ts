import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator.js';
import { SearchDto } from './dto/search.dto.js';
import { WebSearchService } from './web-search.service.js';

@ApiTags('Web Search')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('search')
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  @ApiOperation({
    summary: 'Search the web',
  })
  @ApiResponse({
    status: 201,
    description: 'Search completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query, search provider error, or usage limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  search(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SearchDto,
  ) {
    return this.webSearchService.search(user.id, dto.query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get web search history' })
  @ApiResponse({
    status: 200,
    description: 'Search history returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  history(@CurrentUser() user: CurrentUserData) {
    return this.webSearchService.history(user.id);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent web searches' })
  @ApiResponse({
    status: 200,
    description: 'Recent searches returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  recent(@CurrentUser() user: CurrentUserData) {
    return this.webSearchService.recent(user.id);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search suggestions from previous searches',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'artificial',
    description: 'Partial search query',
  })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions returned successfully',
    schema: {
      example: [
        'artificial intelligence',
        'artificial intelligence news',
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  suggestions(
    @CurrentUser() user: CurrentUserData,
    @Query('q') query: string,
  ) {
    return this.webSearchService.suggestions(user.id, query ?? '');
  }
}