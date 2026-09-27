import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator.js';
import { ChatsService } from './chats.service.js';
import { SendPromptDto } from './dto/send-prompt.dto.js';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post('prompt')
  @ApiOperation({
    summary: 'Send a prompt to an AI provider and save the response',
  })
  @ApiResponse({
    status: 201,
    description: 'AI response generated and conversation saved successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request, provider error, missing API key, or usage limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider or conversation not found' })
  sendPrompt(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SendPromptDto,
  ) {
    return this.chatsService.sendPrompt(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get the current user conversation history',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation history returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getConversations(@CurrentUser() user: CurrentUserData) {
    return this.chatsService.getConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a conversation and all of its messages',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '7dbfd054-bd83-4e31-b60e-7eb71ef68ca2',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation and messages returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  getConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.getConversation(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '7dbfd054-bd83-4e31-b60e-7eb71ef68ca2',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  deleteConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.deleteConversation(user.id, id);
  }
}