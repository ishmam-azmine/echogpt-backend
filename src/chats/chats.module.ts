import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { ChatsController } from './chats.controller.js';
import { ChatsService } from './chats.service.js';

@Module({
  imports: [ProvidersModule, SubscriptionsModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
