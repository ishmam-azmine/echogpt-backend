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
    summary:
      'Send a prompt to an AI provider and save the response',
  })
  @ApiResponse({
    status: 201,
    description: 'AI response generated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Provider error, missing API key, or usage limit reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
    description: 'Conversation history returned',
  })
  getConversations(@CurrentUser() user: CurrentUserData) {
    return this.chatsService.getConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a conversation and all of its messages',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation returned',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  getConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.getConversation(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted',
  })
  deleteConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.deleteConversation(user.id, id);
  }
}
